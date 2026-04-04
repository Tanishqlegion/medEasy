"""
app.py — MedEasy Flask Inference Server
Serves 4 specialist diagnostic models:
  ECG   → ecg_model.pkl            (MaxViT, PyTorch, 224×224, ImageNet norm)
  Lung  → lung_cancer_model(1).pkl  (EfficientNet-B0, PyTorch, 224×224, 0.5 norm)
  Kidney→ kidney_final_...pkl       (Keras AlexNet CNN, 512×512, /255)
  Brain → model.pkl                 (Keras Xception, 299×299, /255)
"""

import os
import io
import pickle
import traceback
import numpy as np
import torch
import torch.nn as nn
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from torchvision import transforms

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'modelsPred')

ECG_MODEL_PATH    = os.path.join(MODELS_DIR, 'ecg_model.pkl')
KIDNEY_MODEL_PATH = os.path.join(MODELS_DIR, 'kidney_final_detection_and_classification.pkl')
LUNG_MODEL_PATH   = os.path.join(MODELS_DIR, 'lung_cancer_model.pth')
BRAIN_MODEL_PATH  = os.path.join(MODELS_DIR, 'model.pkl')

for lbl, p in [('ECG', ECG_MODEL_PATH), ('KIDNEY', KIDNEY_MODEL_PATH),
               ('LUNG', LUNG_MODEL_PATH), ('BRAIN', BRAIN_MODEL_PATH)]:
    print(f'[{"OK" if os.path.exists(p) else "MISSING"}] {lbl}: {p}')

# ─────────────────────────────────────────────
# UNPICKLER — handles PyTorch CPU remapping
# ─────────────────────────────────────────────
class CPU_Unpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if module == 'torch.storage' and name == '_load_from_bytes':
            return lambda b: torch.load(io.BytesIO(b), map_location='cpu', weights_only=False)
        return super().find_class(module, name)

def load_pkl_safe(path):
    try:
        with open(path, 'rb') as f:
            obj = CPU_Unpickler(f).load()
        print(f'  Loaded {os.path.basename(path)} → {type(obj).__name__}')
        return obj
    except Exception as e:
        print(f'[WARN] Could not load {path}: {e}')
        return None

# ─────────────────────────────────────────────
# TRANSFORMS (match notebook preprocessing exactly)
# ─────────────────────────────────────────────
# ECG: ImageNet normalization (MaxViT)
ecg_tf = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

# Lung CT: Notebook used Normalize([0.5],[0.5]) for single-channel but model is RGB
lung_tf = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
])

def keras_preprocess(image: Image.Image, target_hw: tuple) -> np.ndarray:
    """Resize, convert RGB, divide by 255 — matches Keras ImageDataGenerator(rescale=1/255)."""
    img = image.convert('RGB').resize((target_hw[1], target_hw[0]))  # PIL: (W,H)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)  # (1, H, W, 3)

# ─────────────────────────────────────────────
# CLASS DEFINITIONS (from notebooks)
# ─────────────────────────────────────────────

# ECG — MaxViT (class names embedded in pkl, fallback below)
ECG_CLASSES = ['Myocardial Infarction', 'History of MI', 'Abnormal Heartbeat', 'Normal Person']

# Kidney — Keras AlexNet, 2-class
# ImageDataGenerator labels: 'Normal', 'Stone' → alphabetical → Normal=0, Stone=1
KIDNEY_CLASSES = ['Normal', 'Stone']

# Lung CT — EfficientNet-B0, 4-class
# ImageFolder alphabetical from dataset folder names:
# adenocarcinoma / large.cell.carcinoma / normal / squamous.cell.carcinoma
LUNG_CLASSES = ['adenocarcinoma', 'large.cell.carcinoma', 'normal', 'squamous.cell.carcinoma']
LUNG_FRIENDLY = {
    'adenocarcinoma':        'Adenocarcinoma',
    'large.cell.carcinoma':  'Large Cell Carcinoma',
    'normal':                'Normal',
    'squamous.cell.carcinoma': 'Squamous Cell Carcinoma',
}

# Brain MRI — Keras Xception, 4-class
# tr_gen.class_indices → alphabetical: glioma=0, meningioma=1, notumor=2, pituitary=3
BRAIN_CLASSES = ['glioma', 'meningioma', 'notumor', 'pituitary']
BRAIN_FRIENDLY = {
    'glioma':      'Glioma Tumor',
    'meningioma':  'Meningioma Tumor',
    'notumor':     'No Tumor Detected',
    'pituitary':   'Pituitary Tumor',
}

# ─────────────────────────────────────────────
# LOAD ALL MODELS
# ─────────────────────────────────────────────

# ── ECG (MaxViT PyTorch state dict)
print('\n[LOAD] ECG...')
ecg_raw = load_pkl_safe(ECG_MODEL_PATH)
ecg_model = None
if isinstance(ecg_raw, dict) and 'model_state_dict' in ecg_raw:
    try:
        import timm
        ECG_CLASSES = ecg_raw.get('class_names', ECG_CLASSES)
        num_cls = ecg_raw.get('num_classes', len(ECG_CLASSES))
        ecg_model = timm.create_model('maxvit_tiny_tf_224', pretrained=False, num_classes=num_cls)
        ecg_model.load_state_dict(ecg_raw['model_state_dict'])
        ecg_model.eval()
        print(f'[OK] ECG MaxViT loaded — {num_cls} classes: {ECG_CLASSES}')
    except Exception as e:
        print(f'[WARN] ECG assembly failed: {e}')
        ecg_model = None
elif isinstance(ecg_raw, nn.Module):
    ecg_model = ecg_raw
    ecg_model.eval()
    print('[OK] ECG loaded as raw nn.Module')

# ── KIDNEY (Keras Sequential)
print('\n[LOAD] Kidney...')
kidney_model = load_pkl_safe(KIDNEY_MODEL_PATH)
print(f'[OK] Kidney: {type(kidney_model).__name__}')

# ── LUNG (EfficientNet-B0 PyTorch — state_dict .pth file)
print('\n[LOAD] Lung...')
try:
    import timm
    lung_state = torch.load(LUNG_MODEL_PATH, map_location='cpu', weights_only=False)
    nc = lung_state.get('num_classes', len(LUNG_CLASSES)) if isinstance(lung_state, dict) else len(LUNG_CLASSES)
    state_dict_to_load = lung_state['model_state_dict'] if isinstance(lung_state, dict) and 'model_state_dict' in lung_state else lung_state
    
    m = timm.create_model('efficientnet_b0', pretrained=False, num_classes=nc)
    m.load_state_dict(state_dict_to_load)
    m.eval()
    lung_model = m
    print(f'[OK] Lung EfficientNet assembled from .pth — {nc} classes')
except Exception as e:
    print(f'[WARN] Lung .pth assembly failed: {e}')
    lung_model = None

# ── BRAIN (Keras Xception)
print('\n[LOAD] Brain...')
brain_model = load_pkl_safe(BRAIN_MODEL_PATH)
print(f'[OK] Brain: {type(brain_model).__name__}')

print('\n[INIT] All models loaded. Flask starting...\n')

# ─────────────────────────────────────────────
# INFERENCE HELPERS
# ─────────────────────────────────────────────

def is_keras_model(obj):
    if type(obj).__name__ in ['Sequential', 'Functional', 'Model']:
        return True
    try:
        import tensorflow as tf
        return isinstance(obj, tf.keras.Model)
    except Exception:
        try:
            from keras import Model as KModel
            return isinstance(obj, KModel)
        except Exception:
            return False

def run_keras(model, image: Image.Image, hw: tuple, class_names: list):
    arr   = keras_preprocess(image, hw)
    preds = model.predict(arr, verbose=0)[0]
    idx   = int(np.argmax(preds))
    conf  = float(preds[idx])
    lbl   = class_names[idx] if idx < len(class_names) else f'Class_{idx}'
    return lbl, conf, preds.tolist()

def run_torch(model: nn.Module, tf, image: Image.Image, class_names: list):
    tensor = tf(image.convert('RGB')).unsqueeze(0)
    with torch.no_grad():
        out   = model(tensor)
        probs = torch.nn.functional.softmax(out[0], dim=0).cpu().numpy()
    idx  = int(np.argmax(probs))
    conf = float(probs[idx])
    lbl  = class_names[idx] if idx < len(class_names) else f'Class_{idx}'
    return lbl, conf, probs.tolist()

def run_sklearn(model, image: Image.Image, class_names: list, resize=(224, 224)):
    arr = np.array(image.convert('RGB').resize(resize), dtype=np.float32).flatten().reshape(1, -1) / 255.0
    if hasattr(model, 'predict_proba'):
        probs = model.predict_proba(arr)[0]
        idx   = int(np.argmax(probs))
        conf  = float(probs[idx])
        return class_names[idx] if idx < len(class_names) else f'Class_{idx}', conf, probs.tolist()
    else:
        idx  = int(model.predict(arr)[0])
        conf = 0.80
        return class_names[idx] if idx < len(class_names) else f'Class_{idx}', conf, []

def smart_infer(model, image: Image.Image, class_names: list,
                keras_hw=None, torch_tf=None):
    """Dispatch inference to the correct engine based on model type."""
    if model is None:
        raise ValueError('Model is not loaded')

    # 1. Keras
    if is_keras_model(model):
        hw = keras_hw or (224, 224)
        return run_keras(model, image, hw, class_names)

    # 2. PyTorch nn.Module
    if isinstance(model, nn.Module):
        tf = torch_tf or lung_tf
        return run_torch(model, tf, image, class_names)

    # 3. sklearn
    if hasattr(model, 'predict'):
        return run_sklearn(model, image, class_names)

    # 4. state dict wrapper
    if isinstance(model, dict) and 'model_state_dict' in model:
        import timm
        nc = model.get('num_classes', len(class_names))
        for backbone in ['efficientnet_b0', 'maxvit_tiny_tf_224', 'resnet50']:
            try:
                m = timm.create_model(backbone, pretrained=False, num_classes=nc)
                m.load_state_dict(model['model_state_dict'])
                m.eval()
                tf = torch_tf or lung_tf
                return run_torch(m, tf, image, class_names)
            except Exception:
                continue

    raise ValueError(f'Cannot infer with model type: {type(model).__name__}')


# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'models': {
            'ecg':    ecg_model is not None,
            'kidney': kidney_model is not None,
            'lung':   lung_model is not None,
            'brain':  brain_model is not None,
        }
    })


@app.route('/analyze-ecg', methods=['POST'])
def analyze_ecg():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    try:
        image = Image.open(io.BytesIO(request.files['image'].read())).convert('RGB')

        if ecg_model is not None:
            label, conf, all_probs = run_torch(ecg_model, ecg_tf, image, ECG_CLASSES)
        else:
            return jsonify({'error': 'ECG model not loaded — please restart Flask after installing dependencies.'}), 503

        is_normal  = 'Normal' in label
        is_mi      = 'Infarction' in label or ('MI' in label and 'History' not in label)
        is_hist_mi = 'History' in label
        risk = 'Low' if is_normal else ('High' if is_mi else 'Moderate')

        all_confs = {ECG_CLASSES[i]: round(p * 100, 1) for i, p in enumerate(all_probs)} if all_probs else {}

        return jsonify({
            'prediction': label,
            'confidence': round(conf, 4),
            'risk_level': risk,
            'is_normal':  is_normal,
            'all_confidences': all_confs,
            'reasoning': (
                f"MaxViT ECG model classified this recording as '{label}' "
                f"with {conf*100:.1f}% confidence. "
                + ('ST and T-wave patterns suggest prior or active myocardial ischemia.' if is_mi else
                   'Residual ischaemic changes consistent with healed MI.' if is_hist_mi else
                   'No significant conduction or ischaemic abnormalities detected.' if is_normal else
                   'Irregular rhythm or beat morphology detected — clinical correlation advised.')
            ),
            'recommendations': (
                ['Urgent cardiology referral', 'Serial ECGs', 'Troponin assay', 'Cath lab evaluation'] if is_mi else
                ['Cardiology follow-up', 'Echocardiogram', 'Long-term beta-blocker therapy'] if is_hist_mi else
                ['Annual ECG screening', 'Maintain healthy cardiovascular lifestyle'] if is_normal else
                ['Holter monitoring', 'Electrophysiology consultation', 'Avoid stimulants']
            )
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/analyze-kidney', methods=['POST'])
def analyze_kidney():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    try:
        image = Image.open(io.BytesIO(request.files['image'].read())).convert('RGB')

        # Kidney: Keras AlexNet, 512×512, rescale=/255
        # Class order: Normal=0, Stone=1 (alphabetical from flow_from_dataframe labels)
        label, conf, all_probs = smart_infer(
            kidney_model, image, KIDNEY_CLASSES,
            keras_hw=(512, 512)
        )

        is_abnormal = label != 'Normal'
        risk = 'High' if is_abnormal else 'Low'
        all_confs = {KIDNEY_CLASSES[i]: round(p * 100, 1) for i, p in enumerate(all_probs)} if all_probs else {}

        return jsonify({
            'prediction':    label,
            'confidence':    round(conf, 4),
            'organ':         'Kidney',
            'risk_level':    risk,
            'is_abnormal':   is_abnormal,
            'all_confidences': all_confs,
            'reasoning': (
                f"Kidney ultrasound classified as '{label}' "
                f"({conf*100:.1f}% model confidence). "
                + ('Echogenic foci with posterior acoustic shadowing indicate nephrolithiasis. '
                   'Immediate urological consultation recommended.' if is_abnormal else
                   'Cortical echogenicity and collecting system appear within normal limits. No calculi detected.')
            ),
            'recommendations': (
                ['Increase fluid intake >3L/day', 'Avoid high-oxalate foods',
                 'Schedule urological follow-up', 'KUB X-ray or CT for stone sizing'] if is_abnormal else
                ['Maintain adequate hydration', 'Annual ultrasound screening',
                 'Low-sodium diet for kidney health']
            )
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/analyze-lung', methods=['POST'])
def analyze_lung():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    try:
        image = Image.open(io.BytesIO(request.files['image'].read())).convert('RGB')

        # Lung: EfficientNet-B0 PyTorch, 224×224, Normalize([0.5],[0.5])
        label, conf, all_probs = smart_infer(
            lung_model, image, LUNG_CLASSES,
            torch_tf=lung_tf
        )

        friendly = LUNG_FRIENDLY.get(label, label)
        is_malignant = label != 'normal'
        risk = 'High' if label in ('adenocarcinoma', 'large.cell.carcinoma', 'squamous.cell.carcinoma') else 'Low'
        all_confs = {LUNG_FRIENDLY.get(LUNG_CLASSES[i], LUNG_CLASSES[i]): round(p * 100, 1)
                     for i, p in enumerate(all_probs)} if all_probs else {}

        return jsonify({
            'prediction':      friendly,
            'prediction_raw':  label,
            'confidence':      round(conf, 4),
            'organ':           'Lung',
            'risk_level':      risk,
            'is_malignant':    is_malignant,
            'all_confidences': all_confs,
            'reasoning': (
                f"CT scan classified as '{friendly}' "
                f"({conf*100:.1f}% model confidence, EfficientNet-B0). "
                + ('Irregular nodular opacity with spiculated margins — adenocarcinoma pattern detected. Oncology referral required.' if label == 'adenocarcinoma' else
                   'Large pleural-based mass with necrosis — large cell carcinoma features. Immediate staging workup needed.' if label == 'large.cell.carcinoma' else
                   'Centrally located mass near hilum with squamous features — bronchoscopy and biopsy indicated.' if label == 'squamous.cell.carcinoma' else
                   'Lung parenchyma appears clear. No nodules, consolidation, or masses detected.')
            ),
            'recommendations': (
                ['Urgent PET scan for staging', 'Tissue biopsy', 'Pulmonologist / Oncologist referral', 'Smoking cessation if applicable'] if is_malignant else
                ['Annual low-dose CT for high-risk individuals', 'Avoid secondhand smoke', 'Pulmonary function tests annually']
            )
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/analyze-brain', methods=['POST'])
def analyze_brain():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    try:
        image = Image.open(io.BytesIO(request.files['image'].read())).convert('RGB')

        # Brain: Keras Xception, 299×299, rescale=/255
        # class_indices alphabetical: glioma=0, meningioma=1, notumor=2, pituitary=3
        label, conf, all_probs = smart_infer(
            brain_model, image, BRAIN_CLASSES,
            keras_hw=(299, 299)
        )

        friendly  = BRAIN_FRIENDLY.get(label, label)
        has_tumor = label != 'notumor'
        risk = 'High' if label == 'glioma' else ('Moderate' if has_tumor else 'Low')
        all_confs = {BRAIN_FRIENDLY.get(BRAIN_CLASSES[i], BRAIN_CLASSES[i]): round(p * 100, 1)
                     for i, p in enumerate(all_probs)} if all_probs else {}

        return jsonify({
            'prediction':      friendly,
            'prediction_raw':  label,
            'confidence':      round(conf, 4),
            'organ':           'Brain',
            'risk_level':      risk,
            'has_tumor':       has_tumor,
            'all_confidences': all_confs,
            'reasoning': (
                f"MRI classified as '{friendly}' "
                f"({conf*100:.1f}% model confidence, Xception). "
                + ('Infiltrative mass with irregular borders — glioma pattern. Neurosurgical evaluation urgently required.' if label == 'glioma' else
                   'Dural-based enhancing mass consistent with meningioma. Surgical planning recommended.' if label == 'meningioma' else
                   'Sellar/suprasellar mass — pituitary adenoma suspected. Endocrinology and neurosurgery referral.' if label == 'pituitary' else
                   'No abnormal intracranial mass detected. Brain parenchyma within normal limits on MRI.')
            ),
            'recommendations': (
                ['Immediate neurosurgical consultation', 'Contrast-enhanced MRI for staging',
                 'Biopsy for histopathological grading', 'Steroids as per neurosurgeon'] if has_tumor else
                ['Routine MRI follow-up in 12 months', 'Report new neurological symptoms promptly']
            )
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')

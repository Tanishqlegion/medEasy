const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { z } = require('zod');

dotenv.config({ path: path.join(__dirname, '.env') });

// ─── USER SCHEMA ───
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    city: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ['patient', 'doctor', 'lab'], default: 'patient' },
    createdAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
});

const User = mongoose.model('User', UserSchema);

// ─── ZOD SCHEMAS ───
const RegisterSchema = z.object({
    name: z.string().min(2, "Name is too short"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be 6+ characters"),
    role: z.enum(['patient', 'doctor', 'lab']),
    city: z.string().optional()
});

const LoginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required")
});

// ─── PATIENT DIAGNOSIS SCHEMA (Detailed Health Report) ───
const PatientDiagnosisSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // report, ecg, ct, mri
    title: { type: String, required: true },
    fileName: String,
    summary: String,
    // Detailed clinical markers
    parameters: [{
        name: String,
        value: String,
        status: String, // Normal, Abnormal, Critical
        interpretation: String
    }],
    // Risk assessments
    riskAssessment: {
        cardiovascular: { level: String, reason: String },
        metabolic: { level: String, reason: String },
        organHealth: { level: String, reason: String }
    },
    // Lifestyle directives
    medications: [{ name: String, dosage: String, frequency: String, purpose: String }],
    diet: [{ recommendation: String, reason: String, category: String }],
    exercise: [{ activity: String, duration: String, frequency: String, intensity: String }],
    routine: [{ time: String, activity: String, importance: String }],
    threats: [{ level: String, condition: String, description: String, urgency: String }],
    // Cancer-specific data
    cancerData: {
        cancerDetected: Boolean,
        cancerType: String,
        primarySite: String,
        stage: String, // Stage 0, I, II, III, IV
        grade: String, // G1-G4 or Well/Moderately/Poorly differentiated
        tnm: {
            t: String, // T0-T4, TX
            n: String, // N0-N3, NX
            m: String  // M0-M1, MX
        },
        tumorSize: Number, // in cm
        tumorLocation: String,
        tumorFeatures: [String],
        biomarkers: [{ name: String, value: String, significance: String }],
        geneticMutations: [{ gene: String, mutation: String, therapy: String }],
        metastasisSites: [String],
        followUp: {
            recommendedTests: [String],
            specialistReferral: String,
            timeline: String,
            additionalWorkup: [String]
        }
    },
    // Overall
    overallScore: Number, // 0-100 health score
    date: { type: Date, default: Date.now }
});

const PatientDiagnosis = mongoose.model('PatientDiagnosis', PatientDiagnosisSchema);

// ─── DOCTOR DIAGNOSIS SCHEMA (Clinical Threat Assessment) ───
const DoctorDiagnosisSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    fileName: String,
    // Patient demographics
    patientName: { type: String, required: true },
    patientAge: { type: Number, required: true },
    patientSex: { type: String, required: true },
    // Clinical summary
    summary: String,
    // Clinical markers
    parameters: [{
        name: String,
        value: String,
        status: String,
        interpretation: String
    }],
    // Threat alerts
    threats: [{
        severity: String, // CRITICAL, HIGH, MODERATE, LOW
        condition: String,
        description: String,
        immediateAction: String,
        color: String // red, orange, yellow, green
    }],
    // Clinical verdict
    verdict: String, // STABLE, MONITORING, CRITICAL, EMERGENCY
    verdictReason: String,
    date: { type: Date, default: Date.now }
});

const DoctorDiagnosis = mongoose.model('DoctorDiagnosis', DoctorDiagnosisSchema);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Connection
const connectDB = async () => {
    try {
        console.log('🔄 Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB Atlas.');

    } catch (err) {
        console.error('❌ MongoDB Connection Failed:', err.message);
    }
};

connectDB();

app.get('/health', (req, res) => res.json({ status: 'Online' }));

// ─── AUTH ───
app.post('/api/auth/register', async (req, res) => {
    console.log("📥 Registration request received:", req.body);
    
    // 1. Zod Validation
    if (!req.body) return res.status(400).json({ msg: "Request body is missing." });
    
    const result = RegisterSchema.safeParse(req.body);
    if (!result.success) {
        const errors = {};
        result.error.issues.forEach(issue => {
            errors[issue.path[0]] = issue.message;
        });
        return res.status(400).json({ errors });
    }

    const { name, email, password, role, city } = result.data;
    try {
        console.log("🔍 Checking for existing user...");
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'Account already exists.' });
        user = new User({ name, email, password, role, city });
        await user.save();
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    console.log("📥 Login request received:", req.body);
    
    // 1. Zod Validation
    if (!req.body) return res.status(400).json({ msg: "Request body is missing." });

    const result = LoginSchema.safeParse(req.body);
    if (!result.success) {
        const errors = {};
        result.error.issues.forEach(issue => {
            errors[issue.path[0]] = issue.message;
        });
        return res.status(400).json({ errors });
    }

    const { email, password } = result.data;
    try {
        console.log("🔍 Checking user credentials...");
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Account not found.' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Incorrect password.' });
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// ─── AUTH MIDDLEWARE ───
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token provided.' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token invalid.' });
    }
};

// ─── PATIENT DIAGNOSIS ENDPOINTS ───
app.post('/api/patient-diagnosis/save', auth, async (req, res) => {
    try {
        console.log("📥 Patient diagnosis save request:", req.body);
        const diag = new PatientDiagnosis({ userId: req.user.id, ...req.body });
        await diag.save();
        console.log("✅ Patient diagnosis saved successfully:", diag._id);
        res.json(diag);
    } catch (err) {
        console.error("❌ Error saving patient diagnosis:", err.message);
        res.status(500).json({ msg: err.message });
    }
});

app.get('/api/patient-diagnosis/history', auth, async (req, res) => {
    try {
        console.log("📥 Fetching patient history for user:", req.user.id);
        const history = await PatientDiagnosis.find({ userId: req.user.id }).sort({ date: -1 });
        console.log(`📊 Found ${history.length} records`);
        res.json(history);
    } catch (err) {
        console.error("❌ Error fetching patient history:", err.message);
        res.status(500).json({ msg: err.message });
    }
});

// ─── DOCTOR DIAGNOSIS ENDPOINTS ───
app.post('/api/doctor-diagnosis/save', auth, async (req, res) => {
    try {
        console.log("📥 Received doctor diagnosis save request:", req.body);
        const diag = new DoctorDiagnosis({ userId: req.user.id, ...req.body });
        await diag.save();
        console.log("✅ Diagnosis saved successfully:", diag._id);
        res.json(diag);
    } catch (err) {
        console.error("❌ Error saving diagnosis:", err.message);
        res.status(500).json({ msg: err.message });
    }
});

app.get('/api/doctor-diagnosis/all', auth, async (req, res) => {
    try {
        console.log("📥 Fetching all doctor diagnoses for user:", req.user.id);
        const records = await DoctorDiagnosis.find({ userId: req.user.id }).sort({ date: -1 });
        console.log(`📊 Found ${records.length} records`);
        res.json(records);
    } catch (err) {
        console.error("❌ Error fetching diagnoses:", err.message);
        res.status(500).json({ msg: err.message });
    }
});

const PORT = 5002;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
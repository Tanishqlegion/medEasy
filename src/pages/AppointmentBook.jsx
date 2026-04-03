import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Building, User, Clock, CheckCircle2, ArrowRight, ShieldAlert, HeartPulse, Search, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { cn } from '../components/Button';
import { useAuth } from '../context/AuthContext';

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

const labOptions = ["City Lab", "Metro Diagnostics", "Apollo Pathology", "Fortis Health Lab"];
const doctorOptions = ["Dr. Sharma", "Dr. Mehta", "Dr. Iyer", "Dr. Khan", "Dr. Gupta"];
const testOptions = ["Blood Test", "ECG", "MRI Scan", "CT Scan", "X-Ray", "Biopsy", "Urine Test"];
const slots = ["09:00 AM", "10:30 AM", "12:00 PM", "02:00 PM", "04:30 PM", "06:00 PM"];

export default function AppointmentBook() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Load from LS
    const [patients, setPatients] = useState(() => {
        const saved = localStorage.getItem('hackathon_patients');
        return saved ? JSON.parse(saved) : [];
    });

    const [sessionBid, setSessionBid] = useState('');
    const [view, setView] = useState('form'); // form | confirm

    const [labs, setLabs] = useState([
        { id: Date.now(), lab: labOptions[0], doctor: doctorOptions[0], test: testOptions[0], date: new Date().toISOString().split('T')[0], slot: slots[0] },
        { id: Date.now() + 1, lab: labOptions[1], doctor: doctorOptions[1], test: testOptions[1], date: new Date().toISOString().split('T')[0], slot: slots[1] }
    ]);

    const [cancelModal, setCancelModal] = useState({ open: false, pid: null, lab: '', test: '' });

    // Show Report Modal
    const [reportModal, setReportModal] = useState({ open: false, test: '', name: '', bid: '', loading: false });

    useEffect(() => {
        // Generate BID on mount if not exist
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let rnd = '';
        for (let i = 0; i < 4; i++) rnd += chars.charAt(Math.floor(Math.random() * chars.length));
        const now = new Date();
        const dStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const tStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
        setSessionBid(`BK-${rnd}-${dStr}-${tStr}`);

        // Refresh listener for local storage changes across tabs
        const handleStorage = () => {
            const saved = localStorage.getItem('hackathon_patients');
            if (saved) setPatients(JSON.parse(saved));
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const saveToLS = (newPatients) => {
        setPatients(newPatients);
        localStorage.setItem('hackathon_patients', JSON.stringify(newPatients));
    };

    const addLab = () => {
        setLabs([...labs, { id: Date.now(), lab: labOptions[0], doctor: doctorOptions[0], test: testOptions[0], date: new Date().toISOString().split('T')[0], slot: slots[0] }]);
    };

    const removeLab = (id) => {
        if (labs.length <= 1) return alert('You must have at least one lab.');
        setLabs(labs.filter(l => l.id !== id));
    };

    const updateLab = (id, field, value) => {
        setLabs(labs.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const confirmBooking = () => {
        const newSessionPatients = labs.map(l => ({
            id: l.id + Math.random(),
            name: user?.name || 'Patient',
            bid: sessionBid,
            lab: l.lab, doctor: l.doctor, test: l.test, date: l.date, slot: l.slot,
            uploaded: false, file: null, cancelled: false
        }));
        saveToLS([...newSessionPatients, ...patients]);
        setView('confirm');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmCancel = () => {
        const updated = patients.map(p => p.id === cancelModal.pid ? { ...p, cancelled: true } : p);
        saveToLS(updated);
        setCancelModal({ open: false, pid: null, lab: '', test: '' });
    };

    const currentSessionPatients = patients.filter(p => p.bid === sessionBid);

    // Mock Result Logic
    const showReport = (testType, name, bid) => {
        setReportModal({ open: true, test: testType, name, bid, loading: true });
        setTimeout(() => {
            setReportModal(prev => ({ ...prev, loading: false }));
        }, 1800);
    };

    const mockEcg = {
        model: 'MaxViT ECG Model', icon: '🫀', iconColor: 'from-cyan-400 to-blue-600',
        prediction: 'Patient with Abnormal Heartbeat', confidence: '87.4%', risk: 'Moderate',
        reasoning: 'The ECG waveform shows irregular rhythm patterns with QRS complex deviations. ST segments appear borderline with occasional premature ventricular contractions (PVCs) detected.',
        recs: ['Holter monitoring recommended for 24-48 hours', 'Avoid strenuous physical activity', 'Schedule cardiologist follow-up within 72 hours', 'Monitor blood pressure daily']
    };
    const mockGroq = {
        model: 'Groq Llama 3.2 Vision', icon: '🧠', iconColor: 'from-indigo-400 to-purple-600',
        prediction: 'No significant abnormalities detected', confidence: '91.2%', risk: 'Low',
        reasoning: 'The uploaded report has been analysed by the Llama 3.2 Vision model. All key biomarkers and visual indicators appear within normal clinical ranges for this patient demographic.',
        recs: ['Routine annual checkup recommended', 'Maintain current diet and lifestyle', 'Hydration and rest advised', 'Re-test if symptoms persist beyond 2 weeks']
    };

    const currentResult = (reportModal.test === 'ECG') ? mockEcg : mockGroq;

    return (
        <div className="flex-grow flex flex-col px-6 py-12 text-[var(--text-main)] max-w-4xl mx-auto w-full relative z-10 bg-mesh min-h-screen">
            <div className="fixed inset-0 bg-transparent -z-10" />
            <div className="blob w-[600px] h-[600px] bg-cyan-500/5 -top-40 -left-60 blur-[150px]" />
            <div className="blob w-[600px] h-[600px] bg-indigo-500/5 -bottom-40 -right-60 blur-[150px]" />

            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 text-center text-white">Diagnostic Scheduling Array</h1>
            <p className="text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] mb-10 opacity-60">Synchronize multi-facility clinical routing</p>

            {view === 'form' ? (
                <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass-panel p-10 rounded-[40px]">
                    <div className="flex items-center justify-between p-6 rounded-2xl bg-[#030712] border border-white/5 mb-8">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Session Protocol ID</div>
                            <div className="font-mono text-cyan-400 font-bold">{sessionBid}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Active</span>
                        </div>
                    </div>

                    <div className="space-y-6 mb-10">
                        <AnimatePresence>
                            {labs.map((item, index) => (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} key={item.id} className="p-6 rounded-[24px] bg-white/[0.02] border border-white/10 hover:border-cyan-500/30 transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
                                            <span className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-500 flex items-center justify-center text-xs">{index + 1}</span> Node Mapping
                                        </h3>
                                        <button onClick={() => removeLab(item.id)} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-400 bg-rose-500/10 px-3 py-1 rounded-lg">✕ EXCLUDE</button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Facility Routing</label>
                                            <select className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-cyan-500" value={item.lab} onChange={e => updateLab(item.id, 'lab', e.target.value)}>
                                                {labOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Assigned Specialist</label>
                                            <select className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-cyan-500" value={item.doctor} onChange={e => updateLab(item.id, 'doctor', e.target.value)}>
                                                {doctorOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Diagnostic Type</label>
                                            <select className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-cyan-500" value={item.test} onChange={e => updateLab(item.id, 'test', e.target.value)}>
                                                {testOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Date Matrix</label>
                                            <input type="date" className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-cyan-500 uppercase font-mono" value={item.date} onChange={e => updateLab(item.id, 'date', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Time Vector</label>
                                            <select className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-cyan-500" value={item.slot} onChange={e => updateLab(item.id, 'slot', e.target.value)}>
                                                {slots.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    <div className="flex gap-4">
                        <Button variant="outline" onClick={addLab} className="flex-1 bg-white/[0.02] border-white/10 h-14 rounded-[20px] font-black uppercase tracking-widest text-[11px]">+ Allocate Additional Node</Button>
                        <Button className="flex-1 bg-cyan-600 h-14 rounded-[20px] font-black uppercase tracking-widest text-[11px]" onClick={confirmBooking}>Initialize Protocol <ArrowRight className="w-4 h-4 inline ml-2" /></Button>
                    </div>
                </motion.div>
            ) : (
                <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass-panel p-10 rounded-[40px]">
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 flex items-center justify-center rounded-[24px] mx-auto text-2xl mb-6 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]"><CheckCircle2 className="w-8 h-8" /></div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-emerald-400 mb-2">Protocol Secured</h2>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">Session ID: <span className="text-white bg-white/10 px-2 py-1 rounded font-mono ml-2">{sessionBid}</span></p>
                    </div>

                    <div className="space-y-4">
                        {currentSessionPatients.map((p) => (
                            <div key={p.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-2xl bg-[#030712] border border-white/5 group transition-colors hover:border-cyan-500/20">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-cyan-500 shrink-0"><Building className="w-5 h-5" /></div>
                                    <div>
                                        <div className="text-sm font-bold tracking-tight mb-1">{p.lab} <span className="text-[var(--text-muted)] mx-2">/</span> <span className="text-cyan-400">{p.test}</span></div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">{p.doctor} · {p.date} · {p.slot}</div>
                                    </div>
                                </div>
                                <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3 w-full md:w-auto">
                                    {p.cancelled ? (
                                        <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-full md:w-auto justify-center"><ShieldAlert className="w-3 h-3" /> Cancelled</span>
                                    ) : p.uploaded ? (
                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <span className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">✔ {p.file}</span>
                                            <button onClick={() => showReport(p.test, p.name, p.bid)} className="w-full md:w-auto bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-colors flex items-center gap-2 justify-center"><Search className="w-3 h-3" /> Show Report</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <span className="bg-cyan-500/10 text-cyan-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Routing Pending</span>
                                            <button onClick={() => setCancelModal({ open: true, pid: p.id, lab: p.lab, test: p.test })} className="bg-rose-500/5 text-rose-500 border border-rose-500/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/10 transition-colors flex-1 md:flex-none">Abort</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 flex justify-center">
                        <Button variant="outline" className="text-[10px] font-black tracking-[0.2em] uppercase rounded-xl" onClick={() => navigate('/patient-dashboard')}>Return to Dashboard</Button>
                    </div>
                </motion.div>
            )}

            {/* Cancel Modal */}
            {cancelModal.open && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="glass-panel p-8 rounded-3xl max-w-sm w-full border-rose-500/30 text-center">
                        <div className="w-16 h-16 bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-[20px] mx-auto text-2xl mb-6 border border-rose-500/20"><ShieldAlert className="w-8 h-8" /></div>
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Abort Protocol?</h3>
                        <p className="text-xs text-[var(--text-muted)] mb-8 font-medium">Canceling "{cancelModal.test}" at {cancelModal.lab}. This will immediately sever the node connection.</p>
                        <div className="flex gap-4">
                            <Button variant="outline" className="flex-1" onClick={() => setCancelModal({ open: false, pid: null, lab: '', test: '' })}>Dismiss</Button>
                            <Button className="bg-rose-600 flex-1" onClick={confirmCancel}>Confirm Abort</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Summary Modal */}
            {reportModal.open && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
                    <div className="glass-panel p-0 rounded-[32px] w-full max-w-2xl border-white/10 overflow-hidden flex flex-col max-h-[85vh]">

                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${currentResult.iconColor} flex items-center justify-center text-2xl shadow-lg`}>{currentResult.icon}</div>
                                <div>
                                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Analysed By</div>
                                    <div className="font-bold text-sm bg-gradient-to-r from-white to-white/60 text-transparent bg-clip-text uppercase tracking-wider">{currentResult.model}</div>
                                </div>
                            </div>
                            <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white" onClick={() => setReportModal({ open: false, test: '', name: '', bid: '', loading: false })}>✕</button>
                        </div>

                        <div className="p-8 overflow-y-auto w-[100%] hide-scrollbar">
                            {reportModal.loading ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                                    <span className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin mb-6"></span>
                                    <div className="text-xs font-black uppercase tracking-[0.3em]">Deploying AI Matrix...</div>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div>
                                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Patient Profile Segment</div>
                                        <div className="text-lg font-bold">{reportModal.name} <span className="text-xs font-mono text-[var(--text-muted)] opacity-60 ml-3">{reportModal.bid}</span></div>
                                    </div>
                                    <hr className="border-white/5 border-dashed" />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-[#030712] rounded-2xl p-6 border border-white/5">
                                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3 flex items-center gap-2"><Eye className="w-3 h-3 text-cyan-400" /> AI Hypothesis</div>
                                            <div className="text-xl font-black uppercase tracking-tight leading-tight">{currentResult.prediction}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-[#030712] rounded-2xl p-5 border border-white/5 flex flex-col justify-center">
                                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Confidence</div>
                                                <div className="text-2xl font-black text-cyan-400">{currentResult.confidence}</div>
                                            </div>
                                            <div className="bg-[#030712] rounded-2xl p-5 border border-white/5 flex flex-col justify-center">
                                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Risk Level</div>
                                                <div>
                                                    <span className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border", currentResult.risk === 'Low' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20')}>{currentResult.risk}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3">Clinical Reasoning Protocol</div>
                                        <p className="text-sm leading-relaxed text-[var(--text-muted)]">{currentResult.reasoning}</p>
                                    </div>

                                    <div className="bg-white/[0.02] rounded-3xl p-6 border border-white/5">
                                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-5">Tactical Directives</div>
                                        <ul className="space-y-3">
                                            {currentResult.recs.map((rec, i) => (
                                                <li key={i} className="flex items-start gap-3 text-xs text-[var(--text-main)] font-medium"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0"></div> {rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

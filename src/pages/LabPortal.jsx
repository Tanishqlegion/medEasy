import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, UploadCloud, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '../components/Button';
import { cn } from '../components/Button';

const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
};

export default function LabPortal() {
    const [patients, setPatients] = useState([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const saved = localStorage.getItem('hackathon_patients');
        if (saved) setPatients(JSON.parse(saved));

        const handleStorage = () => {
            const s = localStorage.getItem('hackathon_patients');
            if (s) setPatients(JSON.parse(s));
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const handleUpload = (id, e) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0].name;
        const newPatients = patients.map(p => p.id === id ? { ...p, uploaded: true, file } : p);
        setPatients(newPatients);
        localStorage.setItem('hackathon_patients', JSON.stringify(newPatients));
    };

    const activePatients = patients.filter(p => !p.cancelled);
    const doneCount = activePatients.filter(p => p.uploaded).length;
    const pendingCount = activePatients.length - doneCount;

    // Filter logic
    const filtered = patients.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.bid.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filter === 'all' ? true :
                filter === 'pending' ? (!p.uploaded && !p.cancelled) :
                    filter === 'uploaded' ? p.uploaded :
                        filter === 'cancelled' ? p.cancelled : true;
        return matchSearch && matchFilter;
    });

    return (
        <div className="flex-grow flex flex-col px-6 py-12 text-[var(--text-main)] max-w-6xl mx-auto w-full relative z-10 bg-mesh min-h-screen">
            <div className="fixed inset-0 bg-transparent -z-10" />
            <div className="blob w-[600px] h-[600px] bg-cyan-500/5 -top-40 -left-60 blur-[150px]" />

            <div className="flex items-center justify-between mb-10">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-2 text-white">Lab Diagnostics Portal</h1>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-60">Synchronize Patient Reports</p>
                </div>
            </div>

            <motion.div variants={fadeInUp} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="glass-panel p-8 rounded-[32px] border-white/5 flex flex-col items-center justify-center text-center">
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Total Assigned</div>
                    <div className="text-4xl font-black text-cyan-400">{activePatients.length}</div>
                </div>
                <div className="glass-panel p-8 rounded-[32px] border-emerald-500/10 bg-emerald-500/[0.02] flex flex-col items-center justify-center text-center">
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500/60 mb-2">Uploaded</div>
                    <div className="text-4xl font-black text-emerald-500">{doneCount}</div>
                </div>
                <div className="glass-panel p-8 rounded-[32px] border-amber-500/10 bg-amber-500/[0.02] flex flex-col items-center justify-center text-center">
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-500/60 mb-2">Pending Uploads</div>
                    <div className="text-4xl font-black text-amber-500">{pendingCount}</div>
                </div>
            </motion.div>

            <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass-panel p-10 rounded-[40px] flex-grow">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex bg-[#030712] p-1.5 rounded-2xl border border-white/5 max-w-md w-full md:w-auto">
                        {['all', 'pending', 'uploaded', 'cancelled'].map(f => (
                            <button
                                key={f}
                                className={cn("px-5 py-2.5 rounded-[12px] text-[10px] font-black uppercase tracking-widest flex-1", filter === f ? 'bg-cyan-500/10 text-cyan-400' : 'text-[var(--text-muted)] hover:text-white transition-colors')}
                                onClick={() => setFilter(f)}
                            >{f}</button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input type="text" placeholder="SEARCH (NAME / ID)..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-[#030712] border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-xs font-medium uppercase tracking-wider outline-none focus:border-cyan-500/30 transition-colors" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 text-[var(--text-muted)] text-[9px] font-black uppercase tracking-[0.15em]">
                                <th className="pb-4 px-4 font-bold">Patient Data</th>
                                <th className="pb-4 px-4 font-bold">Booking Reference</th>
                                <th className="pb-4 px-4 font-bold">Diagnostic Test</th>
                                <th className="pb-4 px-4 font-bold">Status</th>
                                <th className="pb-4 px-4 text-right font-bold">Report Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filtered.length === 0 ? (
                                <tr><td colSpan="5" className="py-16 text-center text-[var(--text-muted)] text-[11px] font-black uppercase tracking-widest">No matching patient records found</td></tr>
                            ) : filtered.map(p => (
                                <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="py-6 px-4">
                                        <div className="font-bold mb-1 tracking-tight pr-4">{p.name}</div>
                                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{p.lab}</div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="bg-white/5 px-3 py-1.5 rounded-lg inline-block text-[11px] font-mono font-bold text-cyan-400">{p.bid}</div>
                                    </td>
                                    <td className="py-6 px-4 pr-6">
                                        <div className="text-sm font-bold text-white mb-1 whitespace-nowrap">{p.test}</div>
                                        <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.1em]">{p.date} · {p.slot}</div>
                                    </td>
                                    <td className="py-6 px-4">
                                        {p.cancelled ? (
                                            <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">Cancelled</span>
                                        ) : p.uploaded ? (
                                            <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">Uploaded</span>
                                        ) : (
                                            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest">Pending</span>
                                        )}
                                    </td>
                                    <td className="py-6 px-4 text-right">
                                        {p.cancelled ? (
                                            <div className="text-rose-500/50 text-[10px] font-black uppercase tracking-widest flex items-center justify-end gap-2"><ShieldAlert className="w-3 h-3" /> Aborted</div>
                                        ) : p.uploaded ? (
                                            <div className="text-emerald-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-end gap-2"><CheckCircle2 className="w-3 h-3" /> {p.file}</div>
                                        ) : (
                                            <div className="flex items-center justify-end gap-3">
                                                <label className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors">
                                                    <UploadCloud className="w-3 h-3" /> Select File
                                                    <input type="file" accept=".pdf,.png,.jpeg,.jpg" className="hidden" onChange={(e) => handleUpload(p.id, e)} />
                                                </label>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}

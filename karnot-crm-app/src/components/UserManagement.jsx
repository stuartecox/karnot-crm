import React, { useState, useEffect } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase';
import { Card, Button, Input } from '../data/constants';
import { Plus, Trash2, Shield, User, X, Users, Lock } from 'lucide-react';

export default function UserManagement({ currentUser }) {
    const [teamMembers, setTeamMembers] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'STAFF', permissions: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Listen to all users in the team
    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, "users"),
            (snap) => {
                const members = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setTeamMembers(members);
            },
            (err) => console.warn("Users fetch error:", err)
        );
        return () => unsub();
    }, []);

    const handleAddUser = async () => {
        if (!newUser.name || !newUser.email || !newUser.password) {
            setError('Please fill in name, email and password.');
            return;
        }
        if (newUser.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        setError('');

        // Use a secondary Firebase app to create the user without signing out the admin
        let secondaryApp = null;
        try {
            secondaryApp = initializeApp(firebaseConfig, "UserCreation_" + Date.now());
            const secondaryAuth = getAuth(secondaryApp);
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
            const newUid = userCredential.user.uid;

            // Sign out of secondary app immediately
            await fbSignOut(secondaryAuth);

            // Store user profile in Firestore
            await setDoc(doc(db, "users", newUid), {
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                permissions: newUser.permissions,
                teamDataUid: currentUser.uid, // Points to admin's data
                createdAt: serverTimestamp(),
                createdBy: currentUser.uid
            });

            setNewUser({ name: '', email: '', password: '', role: 'STAFF', permissions: [] });
            setShowAddForm(false);
        } catch (err) {
            console.error("Create user error:", err);
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address.');
            } else {
                setError(err.message);
            }
        } finally {
            if (secondaryApp) {
                try { await deleteApp(secondaryApp); } catch (e) { /* cleanup */ }
            }
            setLoading(false);
        }
    };

    const handleDeleteUser = async (member) => {
        if (member.id === currentUser.uid) {
            alert("You cannot delete your own account.");
            return;
        }
        if (!window.confirm(`Remove ${member.name || member.email} from the team? They will no longer be able to log in.`)) {
            return;
        }
        try {
            await deleteDoc(doc(db, "users", member.id));
        } catch (err) {
            console.error("Delete user error:", err);
            alert("Error removing user: " + err.message);
        }
    };

    const togglePermission = (perm) => {
        setNewUser(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm]
        }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
                        <Users size={20} /> Team Members
                    </h2>
                    <p className="text-gray-500 text-sm">Manage who can access the CRM system</p>
                </div>
                <Button onClick={() => setShowAddForm(!showAddForm)} variant="primary">
                    <Plus size={14} className="mr-1" /> Add Staff
                </Button>
            </div>

            {/* Add User Form */}
            {showAddForm && (
                <Card className="border-2 border-orange-200 bg-orange-50/30">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Add New Team Member</h3>
                        <button onClick={() => { setShowAddForm(false); setError(''); }} className="text-gray-400 hover:text-gray-600">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Full Name</label>
                            <Input
                                value={newUser.name}
                                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                placeholder="e.g. Lenilia"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Email Address</label>
                            <Input
                                type="email"
                                value={newUser.email}
                                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                placeholder="e.g. lenilia@karnot.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                                <Lock size={12} className="inline mr-1" /> Temporary Password
                            </label>
                            <Input
                                type="text"
                                value={newUser.password}
                                onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                placeholder="Min 6 characters"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Role</label>
                            <select
                                value={newUser.role}
                                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="STAFF">Staff (Standard Access)</option>
                                <option value="ADMIN">Admin (Full Access)</option>
                            </select>
                        </div>
                    </div>

                    {/* Permissions */}
                    <div className="mt-4">
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Extra Permissions</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => togglePermission('accounts')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                    newUser.permissions.includes('accounts')
                                        ? 'bg-orange-500 text-white border-orange-500'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                                }`}
                            >
                                Accounts Hub Access
                            </button>
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

                    <div className="flex gap-2 mt-4">
                        <Button onClick={handleAddUser} variant="primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Account'}
                        </Button>
                        <Button onClick={() => { setShowAddForm(false); setError(''); }} variant="secondary">
                            Cancel
                        </Button>
                    </div>
                </Card>
            )}

            {/* Team Members List */}
            <div className="grid gap-3">
                {teamMembers.length === 0 && (
                    <Card className="text-center text-gray-400 py-8">
                        No team members found. Add your first staff member above.
                    </Card>
                )}
                {teamMembers.map(member => (
                    <Card key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                member.role === 'ADMIN' ? 'bg-orange-500' : 'bg-blue-500'
                            }`}>
                                {member.role === 'ADMIN' ? <Shield size={18} /> : <User size={18} />}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">
                                    {member.name || 'Unknown'}
                                    {member.id === currentUser.uid && (
                                        <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-black uppercase">You</span>
                                    )}
                                </p>
                                <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-black uppercase tracking-wide px-3 py-1 rounded-full ${
                                member.role === 'ADMIN'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-blue-100 text-blue-700'
                            }`}>
                                {member.role || 'STAFF'}
                            </span>
                            {member.permissions?.includes('accounts') && (
                                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                    Accounts
                                </span>
                            )}
                            {member.id !== currentUser.uid && (
                                <button
                                    onClick={() => handleDeleteUser(member)}
                                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                                    title="Remove user"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

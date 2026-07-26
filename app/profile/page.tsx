"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import ConsumerOrderList from "../components/ConsumerOrderList";
import FarmerOrderList from "../components/FarmerOrderList";
import FarmerListingList from "../components/FarmerListingList";

export default function ProfilePage() {
  const { user, login } = useAuth(); 
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState("");
  
  const [activeTab, setActiveTab] = useState("overview");

  // Edit Settings state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // NGO state
  const [claimedRequests, setClaimedRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    fetchProfile();
    
    if (user.role === "NGO") {
      fetchClaimedRequests();
    }
  }, [user, router]);

  const fetchProfile = async () => {
    try {
      const data = await apiFetch("/api/auth/me");
      setProfileData(data);
      setEditName(data.name || "");
      setEditEmail(data.email || "");
      setLoading(false);
    } catch (err: any) {
      console.error("Failed to fetch profile", err);
      setError("Failed to load profile data.");
      setLoading(false);
    }
  }

  const fetchClaimedRequests = async () => {
    try {
      const data = await apiFetch("/api/emergency/claimed");
      setClaimedRequests(data.emergencyRequests || []);
    } catch (err) {
      console.error("Failed to fetch claimed requests", err);
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");
    
    if (newPassword && newPassword !== confirmPassword) {
      setSaveError("New passwords do not match.");
      return;
    }

    setSaveLoading(true);

    try {
      const updated = await apiFetch("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: editName,
          email: editEmail || null,
        }),
      });

      setProfileData(updated);

      if (newPassword && currentPassword) {
        await apiFetch("/api/auth/password", {
          method: "PATCH",
          body: JSON.stringify({
            currentPassword,
            newPassword
          })
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      setSaveSuccess("Settings updated successfully!");
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update settings.");
    } finally {
      setSaveLoading(false);
    }
  };

  const removeSavedMandi = async (mandiId: string) => {
    try {
      await apiFetch(`/api/auth/saved-mandis/${mandiId}`, { method: 'DELETE' });
      fetchProfile();
    } catch (err: any) {
      alert(err.message || "Failed to remove");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-error/10 border border-error/20 text-error p-4 rounded-lg">
          {error || "Could not load profile."}
        </div>
      </div>
    );
  }

  const renderTabs = () => {
    const tabs = [{ id: "overview", label: "Overview" }];
    
    if (profileData.role === "CONSUMER") {
      tabs.push({ id: "orders", label: "Order History" });
    } else if (profileData.role === "FARMER") {
      tabs.push({ id: "listings", label: "My Listings" });
      tabs.push({ id: "orders", label: "Sales History" });
    }
    
    tabs.push({ id: "settings", label: "Account Settings" });

    return (
      <div className="flex overflow-x-auto border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-charcoal"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  const renderOverview = () => {
    return (
      <div className="space-y-6">
        <div className="glass-card-strong rounded-xl p-6 md:p-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {profileData.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-charcoal">{profileData.name}</h2>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-light/30 text-charcoal">
                {profileData.role}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border mt-6 pt-6">
            <div>
              <p className="text-sm font-medium text-muted mb-1">Phone Number</p>
              <p className="text-charcoal font-medium">{profileData.phone}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted mb-1">Email Address</p>
              <p className="text-charcoal font-medium">
                {profileData.email || <span className="text-muted italic">Not provided</span>}
              </p>
            </div>
            {profileData.location && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-muted mb-1">Location</p>
                <p className="text-charcoal font-medium">{profileData.location}</p>
              </div>
            )}
          </div>
        </div>

        {/* Role Specific Overview Blocks */}
        {profileData.role === "CONSUMER" && (
          <div className="glass-card-strong rounded-xl p-6 md:p-8">
            <h3 className="text-lg font-bold text-charcoal mb-4">Saved Distribution Centers</h3>
            {profileData.savedMandis && profileData.savedMandis.length > 0 ? (
              <div className="space-y-3">
                {profileData.savedMandis.map((sm: any) => (
                  <div key={sm.id} className="flex justify-between items-center p-4 border border-border rounded-lg bg-white/50">
                    <div>
                      <h4 className="font-bold text-charcoal">{sm.mandi.name}</h4>
                      <p className="text-sm text-muted">{sm.mandi.district}, {sm.mandi.state}</p>
                    </div>
                    <button onClick={() => removeSavedMandi(sm.mandiId)} className="text-xs text-error hover:underline">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted italic">You haven't saved any distribution centers yet.</p>
            )}
          </div>
        )}

        {profileData.role === "FARMER" && (
          <div className="glass-card-strong rounded-xl p-6 md:p-8">
            <h3 className="text-lg font-bold text-charcoal mb-4">Assigned Mandi</h3>
            {profileData.assignedMandi ? (
              <div className="p-4 border border-border rounded-lg bg-white/50">
                <h4 className="font-bold text-charcoal">{profileData.assignedMandi.name}</h4>
                <p className="text-sm text-muted">{profileData.assignedMandi.district}, {profileData.assignedMandi.state}</p>
              </div>
            ) : (
              <p className="text-sm text-muted italic">You have not been assigned to a mandi yet.</p>
            )}
          </div>
        )}

        {profileData.role === "NGO" && (
          <div className="space-y-6">
            <div className="glass-card-strong rounded-xl p-6 md:p-8">
              <h3 className="text-lg font-bold text-charcoal mb-4">Verification Status</h3>
              {profileData.ngoProfile?.verificationStatus ? (
                <span className="inline-flex items-center gap-1.5 text-success font-medium">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-error font-medium">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  Pending Verification
                </span>
              )}
            </div>
            
            <div className="glass-card-strong rounded-xl p-6 md:p-8">
              <h3 className="text-lg font-bold text-charcoal mb-4">Claimed Emergency Requests</h3>
              {claimedRequests.length > 0 ? (
                <div className="space-y-3">
                  {claimedRequests.map((req: any) => (
                    <div key={req.id} className="p-4 border border-border rounded-lg bg-white/50">
                      <div className="flex justify-between mb-2">
                        <span className="font-bold text-charcoal text-sm">{req.needType} Request</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${req.status === 'FULFILLED' ? 'bg-success/10 text-success' : 'bg-accent/20 text-accent-dark'}`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted mb-1">For {req.consumer?.name || 'User'} ({req.consumer?.phone})</p>
                      <p className="text-xs text-muted">Claimed: {new Date(req.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted italic">No claimed requests yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="glass-card-strong rounded-xl p-6 md:p-8">
        {saveSuccess && (
          <div className="mb-6 bg-success/10 border border-success/20 text-success px-4 py-3 rounded-lg text-sm">
            {saveSuccess}
          </div>
        )}
        
        {saveError && (
          <div className="mb-6 bg-error/10 border border-error/20 text-error px-4 py-3 rounded-lg text-sm">
            {saveError}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <h3 className="text-lg font-bold text-charcoal">Profile Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Full Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Email Address</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Optional"
              />
            </div>
          </div>

          <hr className="border-border" />
          
          <h3 className="text-lg font-bold text-charcoal">Change Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 max-w-md"
                placeholder="Leave blank if not changing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 max-w-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 max-w-md"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saveLoading}
              className="px-6 py-2 rounded-lg font-medium bg-primary text-white hover:bg-primary-light transition-colors disabled:opacity-50"
            >
              {saveLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 relative">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal tracking-tight">My Profile</h1>
      </div>

      {renderTabs()}

      <div className="mt-6">
        {activeTab === "overview" && renderOverview()}
        
        {activeTab === "orders" && profileData.role === "CONSUMER" && (
          <ConsumerOrderList />
        )}
        
        {activeTab === "orders" && profileData.role === "FARMER" && (
          <FarmerOrderList />
        )}
        
        {activeTab === "listings" && profileData.role === "FARMER" && (
          <FarmerListingList />
        )}

        {activeTab === "settings" && renderSettings()}
      </div>
    </div>
  );
}

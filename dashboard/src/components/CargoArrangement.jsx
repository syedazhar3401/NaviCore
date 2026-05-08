import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Save, X } from 'lucide-react';
import { Waves } from './ui/wave-background';
import StabilityGauge from './StabilityGauge';
import CargoManifestPanel from './CargoManifestPanel';
import ShipSlotGrid from './ShipSlotGrid';
import CargoDetailPanel from './CargoDetailPanel';
import CargoFormModal from './CargoFormModal';
import { calculateBalance, runAIOptimizer } from '../utils/balanceEngine.js';

const BACKEND_URL = 'http://localhost:4000';

// Mock data for demo when backend is unavailable
const MOCK_VOYAGES = [
  {
    id: 'voyage-1',
    vessel: { name: 'NaviCore One' },
    originPort: 'Singapore',
    destinationPort: 'Rotterdam',
    departureDate: '2026-05-15',
    arrivalDate: '2026-05-30',
  }
];



const dedupeVoyages = (voyageList = []) => {
  const seen = new Set();
  return voyageList.filter((voyage) => {
    const vesselName = voyage.vessel?.name || voyage.vesselName || voyage.name || 'Unknown Vessel';
    const key = `${vesselName}__${voyage.originPort || ''}__${voyage.destinationPort || ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const CargoArrangement = ({ globalCargo, setGlobalCargo }) => {
  // State
  const [voyages, setVoyages] = useState([]);
  const [selectedVoyageId, setSelectedVoyageId] = useState('');
  const cargo = globalCargo || [];
  const setCargo = setGlobalCargo || (() => {});
  const [initialLayout, setInitialLayout] = useState({}); // Map of cargoId -> deckSlotId
  const [selectedCargoId, setSelectedCargoId] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [balanceData, setBalanceData] = useState(null);
  const [proposedSlots, setProposedSlots] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingPlacement, setPendingPlacement] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch voyages on mount
  useEffect(() => {
    fetchVoyages();
  }, []);

  // Fetch cargo when voyage changes
  useEffect(() => {
    if (selectedVoyageId) {
      fetchCargo(selectedVoyageId);
    }
  }, [selectedVoyageId]);

  // Recalculate balance when cargo changes
  useEffect(() => {
    if (cargo.length > 0) {
      const balance = calculateBalance(cargo);
      setBalanceData(balance);
    }
  }, [cargo]);

  const fetchVoyages = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/arrangement/voyages`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const voyagesArray = Array.isArray(data) ? dedupeVoyages(data) : [];
      
      if (voyagesArray.length > 0) {
        setVoyages(voyagesArray);
        setSelectedVoyageId(voyagesArray[0].id);
      } else {
        throw new Error('Backend returned empty voyages array');
      }
    } catch (err) {
      console.log('Backend unavailable or empty, using mock data:', err.message);
      const fallbackVoyages = dedupeVoyages(MOCK_VOYAGES);
      setVoyages(fallbackVoyages);
      if (fallbackVoyages.length > 0) {
        setSelectedVoyageId(fallbackVoyages[0].id);
      }
    }
  };

  const fetchCargo = async (voyageId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/arrangement/cargo?voyageId=${voyageId}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      
      // Prevent backend empty array from wiping out our mock data
      if (Array.isArray(data) && data.length === 0 && voyageId === 'voyage-1') {
        console.log('Backend returned empty for voyage-1, using global mock cargo');
        const layout = {};
        cargo.forEach(c => {
          layout[c.id] = c.deckSlotId || null;
        });
        setInitialLayout(layout);
        return;
      }
      
      const cargoData = Array.isArray(data) ? data : [];
      setCargo(cargoData);
      
      // Store initial layout to track planning changes
      const layout = {};
      cargoData.forEach(c => {
        layout[c.id] = c.deckSlotId || null;
      });
      setInitialLayout(layout);
      
      // NO AUTO-OPTIMIZE: Only runs on manual user click.
    } catch (err) {
      console.log('Backend unavailable, using global cargo data');
      // No need to setCargo here because globalCargo is already populated from App.jsx
      // Just map initial layout from the existing globalCargo
      const cargoData = cargo.length > 0 ? cargo : [];
      
      // Store initial layout (mock)
      const layout = {};
      cargoData.forEach(c => {
        layout[c.id] = c.deckSlotId || null;
      });
      setInitialLayout(layout);
    } finally {
      setIsLoading(false);
    }
  };

  const clearProposalArtifacts = useCallback((prevMap, cargoId, slotIds = []) => {
    const nextMap = {};

    Object.entries(prevMap || {}).forEach(([slotKey, proposedCargoId]) => {
      if (proposedCargoId === cargoId) return;
      if (slotIds.includes(slotKey)) return;
      nextMap[slotKey] = proposedCargoId;
    });

    return nextMap;
  }, []);

  const handleAddCargo = () => {
    setEditingCargo(null);
    setIsModalOpen(true);
  };

  const handleEditCargo = (cargoItem) => {
    setEditingCargo(cargoItem);
    setIsModalOpen(true);
  };

  const handleSaveCargo = async (formData) => {
    try {
      if (editingCargo) {
        // Update existing
        const res = await fetch(`${BACKEND_URL}/api/arrangement/cargo/${editingCargo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const updated = await res.json();
        setCargo(prev => prev.map(c => c.id === updated.id ? updated : c));
      } else {
        // Create new
        const res = await fetch(`${BACKEND_URL}/api/arrangement/cargo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const created = await res.json();
        setCargo(prev => [...prev, created]);
      }
    } catch (err) {
      // Demo mode: simulate save locally
      console.log('Backend unavailable, saving locally:', err.message);
      if (editingCargo) {
        setCargo(prev => prev.map(c => c.id === editingCargo.id ? { ...c, ...formData } : c));
      } else {
        const newCargo = {
          id: `cargo-${Date.now()}`,
          ...formData,
          loadStatus: 'MANIFESTED',
          deckSlotId: null,
        };
        setCargo(prev => [...prev, newCargo]);
      }
      setHasUnsavedChanges(true);
    }
  };

  const handleDeleteCargo = async (id) => {
    if (!confirm('Are you sure you want to delete this cargo?')) return;

    const cargoToDelete = cargo.find(c => c.id === id);

    try {
      await fetch(`${BACKEND_URL}/api/arrangement/cargo/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      // Backend unavailable, continue with local deletion
      console.log('Backend unavailable, deleting locally:', err.message);
    }
    
    // Always update local state (works for both backend and demo modes)
    setCargo(prev => prev.filter(c => c.id !== id));
    setProposedSlots(prev => clearProposalArtifacts(prev, id, cargoToDelete?.deckSlotId ? [cargoToDelete.deckSlotId] : []));

    if (selectedCargoId === id) {
      setSelectedCargoId(null);
      setSelectedSlotId(null);
    }
    if (pendingPlacement?.cargoId === id) {
      setPendingPlacement(null);
    }
    setHasUnsavedChanges(true);
  };

  const handleCargoSelect = (cargoId) => {
    setSelectedCargoId(cargoId);
    setSelectedSlotId(null);
    setPendingPlacement(prev => (prev && prev.cargoId !== cargoId ? null : prev));
  };

  const handleSlotClick = (slotId) => {
    const selectedCargo = cargo.find(c => c.id === selectedCargoId);
    const cargoInSlot = cargo.find(c => c.deckSlotId === slotId);

    if (selectedCargo) {
      // Cannot place onto an occupied slot unless it's the same cargo already there
      if (cargoInSlot && cargoInSlot.id !== selectedCargo.id) {
        setSelectedSlotId(slotId);
        setSelectedCargoId(cargoInSlot.id);
        setPendingPlacement(null);
        return;
      }

      const fromSlotId = selectedCargo.deckSlotId || null;

      // Clicking current slot simply selects it
      if (fromSlotId === slotId) {
        setSelectedSlotId(slotId);
        setPendingPlacement(null);
        return;
      }

      setPendingPlacement({
        cargoId: selectedCargo.id,
        fromSlotId,
        toSlotId: slotId,
        mode: fromSlotId ? 'move' : 'add',
      });
      setSelectedSlotId(slotId);
      return;
    }

    // No selected cargo: select slot and cargo in it (if any)
    setSelectedSlotId(slotId);
    if (cargoInSlot) {
      setSelectedCargoId(cargoInSlot.id);
    }
  };

  const handleConfirmPlacement = () => {
    if (!pendingPlacement?.cargoId || !pendingPlacement?.toSlotId) return;

    const { cargoId, fromSlotId, toSlotId } = pendingPlacement;

    setCargo(prev => prev.map(c => (
      c.id === cargoId
        ? { ...c, deckSlotId: toSlotId, loadStatus: 'LOADED', isPlanned: true }
        : c
    )));
    setProposedSlots(prev => clearProposalArtifacts(prev, cargoId, [fromSlotId, toSlotId].filter(Boolean)));
    setHasUnsavedChanges(true);
    setSelectedCargoId(cargoId);
    setSelectedSlotId(toSlotId);
    setPendingPlacement(null);
  };

  const handleCancelPlacement = () => {
    setSelectedSlotId(pendingPlacement?.fromSlotId || null);
    setPendingPlacement(null);
  };

  const handleRemoveFromSlot = (cargoId) => {
    const cargoItem = cargo.find(c => c.id === cargoId);
    const removedFromSlot = cargoItem?.deckSlotId;

    setCargo(prev => prev.map(c => (
      c.id === cargoId
        ? { ...c, deckSlotId: null, loadStatus: 'MANIFESTED' }
        : c
    )));
    setProposedSlots(prev => clearProposalArtifacts(prev, cargoId, removedFromSlot ? [removedFromSlot] : []));
    setPendingPlacement(prev => (prev?.cargoId === cargoId ? null : prev));
    setHasUnsavedChanges(true);
    setSelectedCargoId(cargoId);
    setSelectedSlotId(null);
  };

  const handleResetAllCargo = () => {
    if (!cargo.length) return;
    if (!confirm('Unload all cargo and reset all slot assignments?')) return;

    setCargo(prev => prev.map(c => ({
      ...c,
      deckSlotId: null,
      loadStatus: 'MANIFESTED',
    })));
    setSelectedCargoId(null);
    setSelectedSlotId(null);
    setPendingPlacement(null);
    setProposedSlots({});
    setHasUnsavedChanges(true);
  };

  const persistLayout = async (cargoLayout, { showSuccessAlert = true } = {}) => {
    const slots = cargoLayout.map(c => ({
      cargoId: c.id,
      deckSlotId: c.deckSlotId || null,
    }));

    const res = await fetch(`${BACKEND_URL}/api/arrangement/layout`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    setHasUnsavedChanges(false);
    setProposedSlots({});
    
    // Update initial layout after successful save
    const newInitial = {};
    cargoLayout.forEach(c => {
      newInitial[c.id] = c.deckSlotId || null;
    });
    setInitialLayout(newInitial);

    if (showSuccessAlert) {
      alert('Layout saved successfully!');
    }
  };

  const handleAIOptimize = async (currentCargo = null) => {
    if (isOptimizing) return;
    setIsOptimizing(true);
    const targetCargo = Array.isArray(currentCargo) ? currentCargo : cargo;
    
    try {
      if (selectedVoyageId === 'voyage-1') {
        throw new Error('Forcing local demo AI optimize for voyage-1');
      }

      const res = await fetch(`${BACKEND_URL}/api/arrangement/ai-optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voyageId: selectedVoyageId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `AI optimization failed (HTTP ${res.status})`);
      }

      const proposals = Array.isArray(data?.proposed) ? data.proposed : [];
      const getProposalCargoKey = (proposal) => String(proposal?.cargoId ?? proposal?.id ?? proposal?.itemId ?? '');

      // Convert proposed array to slot map for highlighting
      const proposedMap = {};
      proposals.forEach((p) => {
        if (p?.deckSlotId) proposedMap[p.deckSlotId] = getProposalCargoKey(p);
      });
      setProposedSlots(proposedMap);

      // INCREMENTAL UPDATE for "real-time" feel
      for (let i = 0; i < proposals.length; i++) {
        const p = proposals[i];
        const cargoKey = getProposalCargoKey(p);
        
        setCargo(prev => prev.map((c) => {
          const cId = String(c.id);
          const cCargoId = String(c.cargoId || '');
          if (cId === cargoKey || cCargoId === cargoKey) {
            return { ...c, deckSlotId: p.deckSlotId, loadStatus: 'LOADED' };
          }
          return c;
        }));
        
        // Very short delay for visual effect
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      const unassignedCount = typeof data?.unassigned === 'number'
        ? data.unassigned
        : (data?.unassigned?.count || 0);

      if (unassignedCount > 0 && !currentCargo) { // Only alert if user triggered it manually
        alert(`AI optimize placed what fits. ${unassignedCount} cargo item(s) could not be assigned due to slot limits.`);
      }

      setPendingPlacement(null);
      setHasUnsavedChanges(proposals.length > 0);
      
    } catch (err) {
      // Demo mode: simulate AI optimization locally
      console.log('Backend unavailable, running demo AI optimization:', err.message);
      
      const unassignedCargo = targetCargo.filter(c => !c.deckSlotId && c.loadStatus === 'MANIFESTED');
      const placedCargo = targetCargo.filter(c => c.deckSlotId);
      
      const proposals = runAIOptimizer(unassignedCargo, placedCargo);
      const proposedMap = {};
      
      proposals.forEach((p) => {
        proposedMap[p.deckSlotId] = p.cargoId;
      });
      
      setProposedSlots(proposedMap);
      
      // Incremental demo update
      for (const p of proposals) {
        setCargo(prev => prev.map(c => c.id === p.cargoId ? { ...c, deckSlotId: p.deckSlotId, loadStatus: 'LOADED', isPlanned: true } : c));
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      setPendingPlacement(null);
      setHasUnsavedChanges(proposals.length > 0);
    } finally {
      setIsOptimizing(false);
    }
  };


  const handleSaveLayout = async () => {
    if (pendingPlacement) {
      alert('Confirm or cancel the pending move before saving.');
      return;
    }

    try {
      await persistLayout(cargo, { showSuccessAlert: true });
    } catch (err) {
      // Demo mode: simulate successful save
      console.log('Backend unavailable, saving locally:', err.message);
      
      // Update initial layout (mock)
      const newInitial = {};
      cargo.forEach(c => {
        newInitial[c.id] = c.deckSlotId || null;
      });
      setInitialLayout(newInitial);
      
      setHasUnsavedChanges(false);
      setProposedSlots({});
      alert('Layout saved (demo mode - changes stored locally)!');
    }
  };

  const handleCancelChanges = () => {
    if (hasUnsavedChanges && confirm('Discard unsaved changes?')) {
      fetchCargo(selectedVoyageId);
      setHasUnsavedChanges(false);
      setProposedSlots({});
      setPendingPlacement(null);
      setSelectedCargoId(null);
      setSelectedSlotId(null);
    }
  };

  const selectedVoyage = voyages.find(v => v.id === selectedVoyageId);
  const selectedCargo = cargo.find(c => c.id === selectedCargoId);

  // Error state
  if (error) {
    return (
      <div style={{ 
        padding: '40px', 
        color: 'white',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#ff5252', marginBottom: '16px' }}>Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => { setError(null); fetchVoyages(); }}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: 'var(--cyan-glow)',
            border: 'none',
            borderRadius: '6px',
            color: '#000',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Disable scrolling when this component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const appMain = document.querySelector('.app-main');
    if (appMain) {
      appMain.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (appMain) {
        appMain.style.overflow = '';
      }
    };
  }, []);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: 'calc(100vh - 40px)', 
      overflow: 'hidden', 
      borderRadius: '12px',
      backgroundColor: 'transparent',
      overscrollBehavior: 'none',
    }}
    >
      {/* Waves Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
      }}>
        <Waves 
          strokeColor="rgba(0, 212, 255, 0.3)" 
          backgroundColor="#020c18" 
        />
      </div>
      
      <div style={{ 
        position: 'relative', 
        zIndex: 10, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px',
        boxSizing: 'border-box',
      }}>
        {/* Main Content */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 280px) minmax(0, 1fr) minmax(260px, 280px)',
          gap: '8px',
          backgroundColor: 'transparent',
          borderRadius: '18px',
          overflow: 'hidden',
        }}>
          {/* Left: Manifest Panel */}
          <div style={{ 
            backgroundColor: 'rgba(10,25,41,0.3)',
            backdropFilter: 'blur(4px)',
            overflow: 'hidden',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <CargoManifestPanel
              cargo={cargo}
              initialLayout={initialLayout}
              selectedCargoId={selectedCargoId}
              onSelectCargo={handleCargoSelect}
              onAddCargo={handleAddCargo}
              onAIOptimize={handleAIOptimize}
              onResetAllCargo={handleResetAllCargo}
              isOptimizing={isOptimizing}
              isResetDisabled={cargo.length === 0 || cargo.every(c => !c.deckSlotId)}
            />
          </div>

          {/* Center: Ship Grid */}
          <div style={{ 
            backgroundColor: 'transparent',
            position: 'relative',
            padding: '20px',
            minWidth: 0,
          }}>
            {isLoading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-secondary)',
              }}>
                Loading...
              </div>
            ) : (
              <ShipSlotGrid
                cargo={cargo}
                initialLayout={initialLayout}
                slotColors={balanceData?.slotColors}
                selectedCargoId={selectedCargoId}
                selectedSlotId={selectedSlotId}
                proposedSlots={proposedSlots}
                pendingPlacement={pendingPlacement}
                onSlotClick={handleSlotClick}
              />
            )}

            {/* Action Bar */}
            <div style={{
              position: 'absolute',
              bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '12px',
            }}>
              <button
                onClick={handleSaveLayout}
                disabled={!hasUnsavedChanges || !!pendingPlacement}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: hasUnsavedChanges && !pendingPlacement ? 'var(--cyan-glow)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: hasUnsavedChanges && !pendingPlacement ? '#000' : 'var(--text-secondary)',
                  cursor: hasUnsavedChanges && !pendingPlacement ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                <Save size={18} />
                Save Layout
              </button>
              <button
                onClick={handleCancelChanges}
                disabled={!hasUnsavedChanges}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${hasUnsavedChanges ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '8px',
                  color: hasUnsavedChanges ? 'white' : 'var(--text-secondary)',
                  cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                }}
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>

          {/* Right: Detail Panel */}
          <div style={{ 
            backgroundColor: 'rgba(10,25,41,0.3)',
            backdropFilter: 'blur(4px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}>
            <div style={{
              padding: '16px 16px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedVoyageId}
                  onChange={(e) => setSelectedVoyageId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 32px 9px 12px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {voyages.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.vessel?.name} — {v.originPort} → {v.destinationPort}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  pointerEvents: 'none',
                }} />
              </div>

              {balanceData && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <StabilityGauge score={balanceData.stabilityScore} />
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              <CargoDetailPanel
                cargo={selectedCargo}
                pendingPlacement={pendingPlacement}
                onEdit={handleEditCargo}
                onDelete={handleDeleteCargo}
                onRemoveFromSlot={handleRemoveFromSlot}
                onConfirmPlacement={handleConfirmPlacement}
                onCancelPlacement={handleCancelPlacement}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <CargoFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCargo}
        cargo={editingCargo}
        voyageId={selectedVoyageId}
      />
    </div>
  );
};

export default CargoArrangement;

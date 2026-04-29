import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Save, X } from 'lucide-react';
import { Waves } from './ui/wave-background';
import StabilityGauge from './StabilityGauge';
import CargoManifestPanel from './CargoManifestPanel';
import ShipSlotGrid from './ShipSlotGrid';
import CargoDetailPanel from './CargoDetailPanel';
import CargoFormModal from './CargoFormModal';
import { calculateBalance } from '../utils/balanceEngine.js';

const BACKEND_URL = 'http://localhost:4000';

const CargoArrangement = () => {
  // State
  const [voyages, setVoyages] = useState([]);
  const [selectedVoyageId, setSelectedVoyageId] = useState('');
  const [cargo, setCargo] = useState([]);
  const [selectedCargoId, setSelectedCargoId] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [balanceData, setBalanceData] = useState(null);
  const [proposedSlots, setProposedSlots] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
      // Ensure data is an array
      const voyagesArray = Array.isArray(data) ? data : [];
      setVoyages(voyagesArray);
      // Auto-select first voyage
      if (voyagesArray.length > 0) {
        setSelectedVoyageId(voyagesArray[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch voyages:', err);
      setError(`Cannot connect to backend: ${err.message}. Please ensure the server is running on port 4000 and database is migrated.`);
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
      // Ensure data is an array
      setCargo(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch cargo:', err);
      setCargo([]);
    } finally {
      setIsLoading(false);
    }
  };

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
      console.error('Failed to save cargo:', err);
    }
  };

  const handleDeleteCargo = async (id) => {
    if (!confirm('Are you sure you want to delete this cargo?')) return;
    
    try {
      await fetch(`${BACKEND_URL}/api/arrangement/cargo/${id}`, {
        method: 'DELETE',
      });
      setCargo(prev => prev.filter(c => c.id !== id));
      if (selectedCargoId === id) {
        setSelectedCargoId(null);
      }
    } catch (err) {
      console.error('Failed to delete cargo:', err);
    }
  };

  const handleCargoSelect = (cargoId) => {
    setSelectedCargoId(cargoId);
    setSelectedSlotId(null);
  };

  const handleSlotClick = (slotId) => {
    const selectedCargo = cargo.find(c => c.id === selectedCargoId);
    
    if (selectedCargo && !selectedCargo.deckSlotId) {
      // Place cargo in slot
      setCargo(prev => prev.map(c => 
        c.id === selectedCargoId 
          ? { ...c, deckSlotId: slotId, loadStatus: 'LOADED' }
          : c
      ));
      setHasUnsavedChanges(true);
      setSelectedCargoId(null);
    } else {
      // Just select the slot
      setSelectedSlotId(slotId);
      // Find cargo in this slot
      const cargoInSlot = cargo.find(c => c.deckSlotId === slotId);
      if (cargoInSlot) {
        setSelectedCargoId(cargoInSlot.id);
      }
    }
  };

  const handleRemoveFromSlot = (cargoId) => {
    setCargo(prev => prev.map(c => 
      c.id === cargoId 
        ? { ...c, deckSlotId: null, loadStatus: 'MANIFESTED' }
        : c
    ));
    setHasUnsavedChanges(true);
    setSelectedCargoId(null);
  };

  const handleAIOptimize = async () => {
    setIsOptimizing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/arrangement/ai-optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voyageId: selectedVoyageId }),
      });
      const data = await res.json();
      
      // Convert proposed array to slot map
      const proposedMap = {};
      data.proposed.forEach(p => {
        proposedMap[p.deckSlotId] = p.cargoId;
      });
      setProposedSlots(proposedMap);
      
      // Apply proposed layout to cargo state
      setCargo(prev => prev.map(c => {
        const proposal = data.proposed.find(p => p.cargoId === c.id);
        if (proposal) {
          return { ...c, deckSlotId: proposal.deckSlotId, loadStatus: 'LOADED' };
        }
        return c;
      }));
      setHasUnsavedChanges(true);
    } catch (err) {
      console.error('AI optimization failed:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSaveLayout = async () => {
    try {
      const slots = cargo
        .filter(c => c.deckSlotId)
        .map(c => ({ cargoId: c.id, deckSlotId: c.deckSlotId }));
      
      await fetch(`${BACKEND_URL}/api/arrangement/layout`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
      setHasUnsavedChanges(false);
      setProposedSlots({});
      alert('Layout saved successfully!');
    } catch (err) {
      console.error('Failed to save layout:', err);
      alert('Failed to save layout');
    }
  };

  const handleCancelChanges = () => {
    if (hasUnsavedChanges && confirm('Discard unsaved changes?')) {
      fetchCargo(selectedVoyageId);
      setHasUnsavedChanges(false);
      setProposedSlots({});
      setSelectedCargoId(null);
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
    onWheel={(e) => e.preventDefault()}
    onTouchMove={(e) => e.preventDefault()}
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
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          backgroundColor: 'rgba(0,0,0,0.2)',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ 
              color: 'white', 
              fontSize: '20px',
              fontWeight: 'bold'
            }}>
              Cargo Arrangement
            </h1>
            
            {/* Voyage Selector */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedVoyageId}
                onChange={(e) => setSelectedVoyageId(e.target.value)}
                style={{
                  padding: '8px 32px 8px 12px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '13px',
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
          </div>

          {/* Stability Score */}
          {balanceData && (
            <StabilityGauge score={balanceData.stabilityScore} />
          )}
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '280px 1fr 280px',
          gap: '1px',
          backgroundColor: 'transparent',
          overflow: 'hidden',
        }}>
          {/* Left: Manifest Panel */}
          <div style={{ 
            backgroundColor: 'rgba(10,25,41,0.3)',
            backdropFilter: 'blur(4px)',
            overflow: 'hidden',
          }}>
            <CargoManifestPanel
              cargo={cargo}
              selectedCargoId={selectedCargoId}
              onSelectCargo={handleCargoSelect}
              onAddCargo={handleAddCargo}
              onAIOptimize={handleAIOptimize}
              isOptimizing={isOptimizing}
            />
          </div>

          {/* Center: Ship Grid */}
          <div style={{ 
            backgroundColor: 'transparent',
            position: 'relative',
            padding: '20px',
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
                slotColors={balanceData?.slotColors}
                selectedCargoId={selectedCargoId}
                selectedSlotId={selectedSlotId}
                proposedSlots={proposedSlots}
                onSlotClick={handleSlotClick}
              />
            )}

            {/* Action Bar */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '12px',
            }}>
              <button
                onClick={handleSaveLayout}
                disabled={!hasUnsavedChanges}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: hasUnsavedChanges ? 'var(--cyan-glow)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: hasUnsavedChanges ? '#000' : 'var(--text-secondary)',
                  cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
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
          }}>
            <CargoDetailPanel
              cargo={selectedCargo}
              onEdit={handleEditCargo}
              onDelete={handleDeleteCargo}
              onRemoveFromSlot={handleRemoveFromSlot}
            />
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

import React, { useState, useEffect } from 'react';

const CARGO_TYPES = ['STANDARD', 'REFRIGERATED', 'HAZMAT', 'LIQUID_BULK'];
const HAZARD_CLASSES = ['NONE', 'FLAMMABLE', 'TOXIC', 'EXPLOSIVE', 'CORROSIVE'];

const CargoFormModal = ({ isOpen, onClose, onSave, cargo, voyageId }) => {
  const isEditing = !!cargo;
  
  const [formData, setFormData] = useState({
    cargoId: '',
    label: '',
    type: 'STANDARD',
    weightKg: '',
    contents: '',
    destinationPort: '',
    owner: '',
    hazardClass: 'NONE',
    lengthM: 6.1,
    widthM: 2.4,
    heightM: 2.6,
    notes: '',
  });

  useEffect(() => {
    if (cargo) {
      setFormData({
        cargoId: cargo.cargoId || '',
        label: cargo.label || '',
        type: cargo.type || 'STANDARD',
        weightKg: cargo.weightKg || '',
        contents: cargo.contents || '',
        destinationPort: cargo.destinationPort || '',
        owner: cargo.owner || '',
        hazardClass: cargo.hazardClass || 'NONE',
        lengthM: cargo.lengthM || 6.1,
        widthM: cargo.widthM || 2.4,
        heightM: cargo.heightM || 2.6,
        notes: cargo.notes || '',
      });
    } else {
      // Generate next cargo ID
      const nextId = `CARGO-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`;
      setFormData({
        cargoId: nextId,
        label: '',
        type: 'STANDARD',
        weightKg: '',
        contents: '',
        destinationPort: '',
        owner: '',
        hazardClass: 'NONE',
        lengthM: 6.1,
        widthM: 2.4,
        heightM: 2.6,
        notes: '',
      });
    }
  }, [cargo, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'weightKg' || name.includes('M') ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      weightKg: parseFloat(formData.weightKg) || 0,
      voyageId,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#0a1929',
        border: '1px solid var(--cyan-glow)',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <h2 style={{ 
          color: 'var(--cyan-glow)', 
          marginBottom: '20px',
          fontSize: '20px'
        }}>
          {isEditing ? 'Edit Cargo' : 'Add New Cargo'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                Cargo ID
              </label>
              <input
                type="text"
                name="cargoId"
                value={formData.cargoId}
                onChange={handleChange}
                disabled={isEditing}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                Label
              </label>
              <input
                type="text"
                name="label"
                value={formData.label}
                onChange={handleChange}
                placeholder="e.g., Steel Coils - Lot A"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                  }}
                >
                  {CARGO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                  Weight (kg)
                </label>
                <input
                  type="number"
                  name="weightKg"
                  value={formData.weightKg}
                  onChange={handleChange}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                  }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                  Destination
                </label>
                <input
                  type="text"
                  name="destinationPort"
                  value={formData.destinationPort}
                  onChange={handleChange}
                  placeholder="Port name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                  Owner
                </label>
                <input
                  type="text"
                  name="owner"
                  value={formData.owner}
                  onChange={handleChange}
                  placeholder="Company name"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                Hazard Class
              </label>
              <select
                name="hazardClass"
                value={formData.hazardClass}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: formData.hazardClass !== 'NONE' ? '#ff5252' : 'white',
                  fontSize: '14px',
                }}
              >
                {HAZARD_CLASSES.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Special handling instructions..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginTop: '24px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                backgroundColor: 'var(--cyan-glow)',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}
            >
              {isEditing ? 'Save Changes' : 'Add Cargo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CargoFormModal;

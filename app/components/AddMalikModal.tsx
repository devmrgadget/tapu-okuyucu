"use client";

import { useState } from "react";

interface AddMalikModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string) => Promise<void>;
}

export default function AddMalikModal({
  isOpen,
  onClose,
  onAdd,
}: AddMalikModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Malik adı boş olamaz");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onAdd(name.trim());
      setName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ marginBottom: 20 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            ✨ Yeni Malik Ekle
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
            Tapu kaydını incelemek istediğiniz kişinin adını girin
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="input-field"
            placeholder="Örn: Mehmet Yılmaz"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            autoFocus
            style={{ marginBottom: 12 }}
          />

          {error && (
            <p
              style={{
                color: "var(--accent-red)",
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              ⚠️ {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 16,
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              İptal
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span
                    style={{
                      display: "inline-block",
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "white",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Ekleniyor...
                </>
              ) : (
                <>
                  <span>➕</span> Malik Ekle
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

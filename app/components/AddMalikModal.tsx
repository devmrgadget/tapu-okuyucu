"use client";

import { useState } from "react";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";

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
    <Modal isOpen={isOpen} onClose={onClose} title="✨ Yeni Malik Ekle">
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Tapu kaydını incelemek istediğiniz kişinin adını girin
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <Input
            placeholder="Örn: Mehmet Yılmaz"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            error={error}
            autoFocus
          />
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            İptal
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Ekleniyor...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>➕</span> Malik Ekle
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

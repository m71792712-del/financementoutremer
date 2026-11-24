'use client';

import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { useI18n } from '@/lib/i18n/provider';
import type { CardType } from '@/types/db';

interface Props {
  cardTypes: CardType[];
  value: string; // uuid d'un type de carte, « other », ou chaîne vide tant que rien n'est choisi
  onChange: (id: string) => void;
  otherName: string;
  onOtherName: (name: string) => void;
  error?: string;
  otherError?: string;
}

/** Choix du type de carte : liste déroulante obligatoire (types proposés + « Autre carte »). */
export function CardPicker({ cardTypes, value, onChange, otherName, onOtherName, error, otherError }: Props) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <SelectField label={t('apply.card')} required value={value} onChange={(e) => onChange(e.target.value)} error={error}>
        <option value="" disabled>{t('apply.card.ph')}</option>
        {cardTypes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        <option value="other">{t('apply.card.other')}</option>
      </SelectField>

      {value === 'other' && (
        <TextField
          label={t('apply.card.otherName')}
          placeholder={t('apply.card.otherName')}
          value={otherName}
          onChange={(e) => onOtherName(e.target.value)}
          maxLength={60}
          required
          autoComplete="off"
          error={otherError}
        />
      )}
    </div>
  );
}

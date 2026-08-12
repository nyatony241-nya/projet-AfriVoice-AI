import React, { useState } from 'react';
import { Language } from '../types';

interface MobileMoneySelectorProps {
  isDark: boolean;
  language: Language;
  countryId: string;
  operators: string[];
  onSubmit: (phoneNumber: string, operator: string) => void;
}

const OPERATOR_LOGOS: Record<string, string> = {
  'Orange Money': '🟠',
  'MTN MoMo': '🟡',
  'M-Pesa': '🟢',
  'Wave': '🔵',
  'Airtel Money': '🔴',
  'Free Money': '🟣',
  'Moov Money': '🟤',
  'Vodafone Cash': '🔴',
  'T-Money': '⚪',
  'Flooz': '🟡',
  'Wizall': '🟠',
  'OPay': '🟢',
};

const COUNTRY_CODES: Record<string, string> = {
  NG: '+234', CI: '+225', CM: '+237', SN: '+221', CG: '+242', GH: '+233',
  KE: '+254', GA: '+241', BJ: '+229', BF: '+226', ML: '+223', TG: '+228',
  EG: '+20', UG: '+256', TZ: '+255',
};

const MobileMoneySelector: React.FC<MobileMoneySelectorProps> = ({
  isDark,
  language,
  countryId,
  operators,
  onSubmit,
}) => {
  const isEn = language === 'en';
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const countryCode = COUNTRY_CODES[countryId] || '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOperator && phoneNumber.length >= 8) {
      onSubmit(`${countryCode}${phoneNumber}`, selectedOperator);
    }
  };

  const isValid = selectedOperator !== null && phoneNumber.length >= 8;

  return (
    <div className="w-full">
      <h3 className="text-sm font-bold mb-3">
        {isEn ? 'Select Operator' : 'Sélectionnez un Opérateur'}
      </h3>
      
      <div className="grid grid-cols-2 gap-3 mb-6">
        {operators.map((operator) => {
          const isSelected = selectedOperator === operator;
          const logo = OPERATOR_LOGOS[operator] || '📱';
          
          return (
            <button
              key={operator}
              type="button"
              onClick={() => setSelectedOperator(operator)}
              className={`flex items-center gap-2 p-3 rounded-[16px] border-2 transition-all duration-200 ${
                isSelected
                  ? `border-[#D4FF00] ${isDark ? 'bg-[#1E2230]' : 'bg-zinc-100'} scale-[1.02]`
                  : `${isDark ? 'border-white/10 hover:border-white/20 bg-[#14151C]' : 'border-zinc-200 hover:border-zinc-300 bg-white'}`
              }`}
            >
              <span className="text-xl">{logo}</span>
              <span className="font-bold text-sm truncate">{operator}</span>
            </button>
          );
        })}
      </div>

      {selectedOperator && (
        <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-sm font-bold mb-2">
            {isEn ? 'Phone Number' : 'Numéro de Téléphone'}
          </label>
          <div className="flex flex-row">
            <div className={`flex items-center justify-center px-4 rounded-l-[16px] border-y border-l ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-100 border-zinc-200'
            }`}>
              <span className="font-bold">{countryCode}</span>
            </div>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="012345678"
              className={`flex-1 p-3 rounded-r-[16px] border ${
                isDark 
                  ? 'bg-[#09090B] border-white/10 focus:border-[#D4FF00] text-white' 
                  : 'bg-white border-zinc-200 focus:border-[#D4FF00] text-black'
              } outline-none transition-colors`}
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className={`w-full mt-6 py-4 rounded-[24px] font-black uppercase tracking-wider transition-all duration-300 ${
              isValid
                ? 'bg-[#D4FF00] text-black hover:bg-[#E2FF3B] hover:scale-[1.02] active:scale-[0.98]'
                : isDark
                ? 'bg-white/10 text-zinc-500 cursor-not-allowed'
                : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
            }`}
          >
            {isEn ? 'Confirm Payment' : 'Confirmer le Paiement'}
          </button>
        </form>
      )}
    </div>
  );
};

export default MobileMoneySelector;

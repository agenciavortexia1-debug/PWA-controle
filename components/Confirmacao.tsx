
import React, { useState } from 'react';

interface ConfirmacaoProps {
  titulo: string;
  texto: string;
  confirmar: string;
  onConfirmar: () => Promise<void>;
  onCancelar: () => void;
}

// Pergunta antes de apagar, dizendo o que acontece, no lugar da caixinha do navegador.
export const Confirmacao: React.FC<ConfirmacaoProps> = ({ titulo, texto, confirmar, onConfirmar, onCancelar }) => {
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const confirmarAgora = async () => {
    setApagando(true);
    setErro(null);
    try {
      await onConfirmar();
      onCancelar();
    } catch {
      setErro('Não deu pra apagar. Confira a internet e tente de novo.');
      setApagando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[60] sm:p-4" onClick={() => !apagando && onCancelar()}>
      <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
        <p className="text-sm text-gray-600">{texto}</p>
        {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{erro}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onCancelar} disabled={apagando} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-60">
            Cancelar
          </button>
          <button type="button" onClick={confirmarAgora} disabled={apagando} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-60">
            {apagando ? 'Apagando...' : confirmar}
          </button>
        </div>
      </div>
    </div>
  );
};

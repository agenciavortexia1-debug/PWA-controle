
import React, { useState } from 'react';

export interface PontoEvolucao {
  chave: string;
  eixo: string;     // rótulo curto embaixo da coluna
  rotulo: string;   // rótulo completo no quadro de números
  faturamento: number;
  lucro: number;
  vendas: number;
  parcial: boolean; // o período de hoje, que ainda não terminou
}

const ROXO = '#920074';
const VERDE = '#059669';
const emReais = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

// Colunas de HTML, como no Mercadinho: a coluna roxa é o faturamento do período
// e a barra verde dentro dela é o lucro. Tocar numa coluna mostra os números.
export const GraficoEvolucao: React.FC<{ pontos: PontoEvolucao[] }> = ({ pontos }) => {
  const [escolhido, setEscolhido] = useState<string | null>(null);
  if (!pontos.length) return <p className="text-sm text-gray-400 italic py-6 text-center">Nenhuma venda com estes filtros.</p>;

  const maior = Math.max(...pontos.map(p => p.faturamento), 0);
  const ultimoComVenda = [...pontos].reverse().find(p => p.faturamento > 0);
  const mostrado = pontos.find(p => p.chave === escolhido) ?? ultimoComVenda ?? pontos[pontos.length - 1];
  const rotuloACada = Math.max(1, Math.ceil(pontos.length / 6));
  const altura = (v: number) => (maior > 0 && v > 0 ? Math.max(1.5, (v / maior) * 100) : 0);

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: ROXO }} /> Faturamento</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: VERDE }} /> Lucro</span>
      </div>

      <div className="pt-5 pb-6">
        <div className="relative h-44 flex items-end gap-[2px] border-b border-gray-200">
          <div className="absolute top-0 left-0 right-0 border-t border-gray-100" />
          <span className="absolute -top-5 left-0 text-[10px] text-gray-400">{emReais(maior)}</span>
          {pontos.map((p, i) => {
            const ativo = p.chave === mostrado.chave;
            return (
              <button
                key={p.chave}
                type="button"
                onClick={() => setEscolhido(p.chave)}
                title={`${p.rotulo}: ${emReais(p.faturamento)}`}
                aria-label={`${p.rotulo}: ${emReais(p.faturamento)} de faturamento, ${emReais(p.lucro)} de lucro`}
                className={`relative flex-1 min-w-0 h-full flex items-end justify-center rounded-t ${ativo ? 'bg-gray-100' : ''}`}
              >
                <div
                  className="relative w-full max-w-[24px] rounded-t-[4px] flex items-end justify-center"
                  style={{ height: `${altura(p.faturamento)}%`, background: ROXO, opacity: p.parcial ? 0.55 : 1 }}
                >
                  <div className="w-1/2 rounded-t-[3px]" style={{ height: `${p.faturamento > 0 ? Math.max(0, Math.min(1, p.lucro / p.faturamento)) * 100 : 0}%`, background: VERDE }} />
                </div>
                {i % rotuloACada === 0 && (
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 whitespace-nowrap">{p.eixo}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
        <p className="text-xs font-bold text-gray-700">
          {mostrado.rotulo}{mostrado.parcial ? ' (ainda em andamento)' : ''}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Faturamento</p>
            <p className="text-sm font-bold text-gray-900">{emReais(mostrado.faturamento)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Lucro</p>
            <p className="text-sm font-bold text-gray-900">{emReais(mostrado.lucro)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-bold">Vendas</p>
            <p className="text-sm font-bold text-gray-900">{mostrado.vendas}</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-gray-400">Toque numa coluna para ver os números dela.</p>
      </div>
    </div>
  );
};

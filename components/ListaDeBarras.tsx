
import React from 'react';

export interface ItemDaLista {
  chave: string;
  rotulo: string;
  valor: number;     // define o comprimento da barra
  texto: string;     // o número principal, à direita do nome
  detalhe?: string;  // informação de apoio, em cinza
}

interface ListaDeBarrasProps {
  itens: ItemDaLista[];
  cor: string;
  selecionado?: string | null;
  onToque?: (chave: string) => void;
  vazio?: string;
}

// Barras feitas de HTML, como no Mercadinho: nome e valor ficam numa linha
// acima da barra, então nunca são cortados, por menor que a barra seja.
export const ListaDeBarras: React.FC<ListaDeBarrasProps> = ({ itens, cor, selecionado, onToque, vazio = 'Nenhuma venda com estes filtros.' }) => {
  if (!itens.length) return <p className="text-sm text-gray-400 italic py-6 text-center">{vazio}</p>;
  const maior = Math.max(...itens.map(i => i.valor), 0);

  return (
    <ul className="space-y-3.5">
      {itens.map(item => {
        const largura = maior > 0 && item.valor > 0 ? Math.max(1.5, (item.valor / maior) * 100) : 0;
        const apagado = !!selecionado && selecionado !== item.chave;
        const conteudo = (
          <>
            <div className="flex items-start justify-between gap-3">
              <span className={`text-sm font-semibold break-words min-w-0 ${apagado ? 'text-gray-400' : 'text-gray-800'}`}>{item.rotulo}</span>
              <span className={`text-sm font-bold whitespace-nowrap text-right ${apagado ? 'text-gray-400' : 'text-gray-800'}`}>
                {item.texto}
                {item.detalhe && <span className="block text-[11px] font-medium text-gray-400">{item.detalhe}</span>}
              </span>
            </div>
            <div className="mt-1 h-2.5 rounded-r-[4px] transition-all" style={{ width: `${largura}%`, background: apagado ? '#e2e8f0' : cor }} />
          </>
        );
        return (
          <li key={item.chave}>
            {onToque
              ? <button type="button" onClick={() => onToque(item.chave)} className="w-full text-left">{conteudo}</button>
              : conteudo}
          </li>
        );
      })}
    </ul>
  );
};

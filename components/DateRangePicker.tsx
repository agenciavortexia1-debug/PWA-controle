
import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { hojeManaus, dataCurta } from '../utils/datas';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onRange: (start: string, end: string) => void;
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// O mesmo calendário do RampControll: um toque no dia inicial e outro no
// final escolhem o período; dois toques rápidos no mesmo dia escolhem só ele.
export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onRange }) => {
  const hoje = hojeManaus();
  const [mesVisto, setMesVisto] = useState(() => {
    const [ano, mes] = (startDate || hoje).split('-').map(Number);
    return { ano, mes: mes - 1 };
  });
  const [escolhendo, setEscolhendo] = useState(false);
  const [inicioTemp, setInicioTemp] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { ano, mes } = mesVisto;
  const andarMes = (passo: number) => {
    const d = new Date(ano, mes + passo, 1);
    setMesVisto({ ano: d.getFullYear(), mes: d.getMonth() });
  };

  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const dias: (string | null)[] = Array(new Date(ano, mes, 1).getDay()).fill(null);
  for (let d = 1; d <= totalDias; d++) {
    dias.push(`${ano}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  const tocarDia = (dia: string) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      onRange(dia, dia);
      setEscolhendo(false);
      setInicioTemp('');
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!escolhendo) {
        setInicioTemp(dia);
        setEscolhendo(true);
      } else {
        onRange(inicioTemp <= dia ? inicioTemp : dia, inicioTemp <= dia ? dia : inicioTemp);
        setEscolhendo(false);
        setInicioTemp('');
      }
    }, 230);
  };

  const ehPonta = (d: string) => d === (escolhendo ? inicioTemp : startDate) || (!escolhendo && d === endDate);
  const noMeio = (d: string) => !escolhendo && !!startDate && !!endDate && d > startDate && d < endDate;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 w-full">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => andarMes(-1)} className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold text-gray-800">{MESES[mes]} {ano}</span>
        <button type="button" onClick={() => andarMes(1)} className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-gray-400 py-0.5">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {dias.map((d, i) => {
          if (!d) return <div key={`vazio-${i}`} />;
          const ponta = ehPonta(d);
          return (
            <button
              type="button"
              key={d}
              onClick={() => tocarDia(d)}
              className={`py-2 rounded-lg text-xs transition ${
                ponta ? 'bg-[#920074] text-white font-bold'
                : noMeio(d) ? 'bg-[#fce7f6] text-gray-900'
                : d === hoje ? 'text-red-500 font-semibold hover:bg-gray-50'
                : 'text-gray-900 hover:bg-gray-50'
              }`}
            >
              {parseInt(d.split('-')[2], 10)}
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100 text-center text-[11px] text-gray-500">
        {escolhendo
          ? 'Agora toque no dia final'
          : startDate && endDate
            ? startDate === endDate ? `Dia ${dataCurta(startDate)}` : `${dataCurta(startDate)} → ${dataCurta(endDate)}`
            : 'Toque no dia inicial (dois toques escolhem um dia só)'}
      </div>
    </div>
  );
};

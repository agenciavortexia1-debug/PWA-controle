// O "hoje" do app é sempre o de Manaus, não o do aparelho nem o de Londres
// (toISOString devolve a data em UTC, que já virou o dia às 20h de Manaus).
// As vendas guardam só a data, no formato AAAA-MM-DD.
const FUSO = 'America/Manaus';

export const hojeManaus = (): string => {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const valor = (tipo: string) => partes.find(p => p.type === tipo)!.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
};

// "07/10" para datas deste ano, "07/10/25" para as de outro ano.
export const dataCurta = (dia: string): string => {
  const [ano, mes, d] = dia.split('-');
  return ano === hojeManaus().slice(0, 4) ? `${d}/${mes}` : `${d}/${mes}/${ano.slice(2)}`;
};

// O mesmo dia no mês anterior; se o mês anterior for mais curto, o último dia
// dele (31/03 vira 28/02).
export const mesmoDiaMesAnterior = (dia: string): string => {
  const [ano, mes, d] = dia.split('-').map(Number);
  const alvo = new Date(Date.UTC(ano, mes - 2, 1));
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  return `${alvo.toISOString().slice(0, 7)}-${String(Math.min(d, ultimoDia)).padStart(2, '0')}`;
};

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export type Escala = 'daily' | 'weekly' | 'monthly';

// Em que dia, semana (de domingo a sábado) ou mês cai uma data. A chave ordena
// certo (AAAA-MM-DD ou AAAA-MM); `eixo` é o rótulo curto embaixo da coluna e
// `rotulo` o completo.
export const periodoDa = (dia: string, tipo: Escala): { chave: string; rotulo: string; eixo: string } => {
  if (tipo === 'daily') return { chave: dia, rotulo: `Dia ${dataCurta(dia)}`, eixo: dataCurta(dia) };
  const [ano, mes, d] = dia.split('-').map(Number);
  if (tipo === 'monthly') {
    return { chave: dia.slice(0, 7), rotulo: `${MESES[mes - 1][0].toUpperCase()}${MESES[mes - 1].slice(1)} de ${ano}`, eixo: `${MESES[mes - 1].slice(0, 3)}/${String(ano).slice(2)}` };
  }
  const data = new Date(Date.UTC(ano, mes - 1, d));
  const domingo = new Date(data.getTime() - data.getUTCDay() * 86400000).toISOString().slice(0, 10);
  const sabado = new Date(data.getTime() + (6 - data.getUTCDay()) * 86400000).toISOString().slice(0, 10);
  return { chave: domingo, rotulo: `Semana de ${dataCurta(domingo)} a ${dataCurta(sabado)}`, eixo: dataCurta(domingo) };
};

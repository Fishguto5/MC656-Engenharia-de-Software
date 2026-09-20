export type Candidato = {
    id: string
    nome: string
    partido: string
    voto: number
}

export type VotacaoPresidente = {
    id: string
    data: Date
    candidatos: Candidato[]
    votosBrancos: number
    votosNulos: number
    totalVotos: number
}

export function precisaSegundoTurno(votacao: VotacaoPresidente): boolean {
    const votosValidos = votacao.candidatos.reduce((acc, c) => acc + c.voto, 0);
    if(votosValidos == 0) return false;

    const maisVotado = [...votacao.candidatos].sort((a, b) => b.voto - a.voto)[0];
    return (maisVotado.voto / votosValidos) <= 0.5;
}

export function getCandidatoSegundoTurno(votacao: VotacaoPresidente): [Candidato, Candidato] | null {
    if(!precisaSegundoTurno(votacao)) return null;

    const ordenados = [...votacao.candidatos].sort((a, b) => b.voto - a.voto);
    return [ordenados[0], ordenados[1]];
}
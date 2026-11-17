'use client';

import { ConsultaPublicaVotarForm } from '@/components/VotarForm/ConsultaPublicaVotar';
import { PresidenteVotarForm } from '@/components/VotarForm/PresidenteVotar';
import { ConsultaPublica, EleicaoDeputado, EleicaoPresidente } from '@/interfaces/eleicaoInterfaces';
import { firebaseElection, VotePayload } from '@/lib/repository/firebaseElectionFacade';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

type ElectionData = EleicaoDeputado | EleicaoPresidente | ConsultaPublica

export default function VotacaoPage() {
  const params = useParams()
  const id = params.id as string;
  const [electionData, setElectionData] = useState<ElectionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function getEleicao() {
      if (!id) return;

      try {
        const tipoEleicao = await firebaseElection.getType(id);
        if (!tipoEleicao) return;

        const eleicao = await firebaseElection.findById(id, tipoEleicao);
        if (isMounted && eleicao && eleicao.status === "open") {
          setElectionData({ ...eleicao, type: tipoEleicao } as ElectionData);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    getEleicao();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleVoteSubmit = async (payload: VotePayload) => {
    if (!electionData) return;
    await firebaseElection.registerVote(electionData.id, payload);
    alert('Voto registrado com sucesso!');
  };

  if (loading) return <p>Carregando votação...</p>;
  if (!electionData) return <p>Votação não encontrada.</p>;

  return (
    <main className="signup-candidate-page">
      {electionData.type === 'public-consultation' && (
        <ConsultaPublicaVotarForm election={electionData} onSubmit={handleVoteSubmit} />
      )}

      {electionData.type === 'president' && (
        <PresidenteVotarForm election={electionData} onSubmit={handleVoteSubmit} />
      )}

      {/* {electionData.type === 'deputy' && (
        <DeputadoVotarForm election={electionData} onSubmit={handleVoteSubmit} />
      )} */}
    </main>
  );
}
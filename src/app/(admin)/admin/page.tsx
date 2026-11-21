import Link from 'next/link'
import SignOutButton from './sign-out-button'

export default function AdminDashboard() {
  return (
    <main className="signup-page">
      <section className="signup-card" aria-labelledby="admin-title">
        <h1 id="admin-title">Painel administrativo</h1>
        <nav className="signup-form" aria-label="Gerenciamento">
          <Link className="primary-btn" href="/candidato">Gerenciar candidatos</Link>
          <Link className="primary-btn" href="/eleicao/criar">Criar eleição</Link>
          <Link className="primary-btn" href="/admin/cadastrar">Cadastrar administrador</Link>
          <SignOutButton />
        </nav>
      </section>
    </main>
  )
}

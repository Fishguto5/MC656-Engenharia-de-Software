'use client'

import { useEffect, useState } from 'react'
import '../candidato.css'
import { useSearchParams } from 'next/navigation'

export default function CadastrarCandidato() {
  const [formsData, setFormsData] = useState({
    name: '',
    party: '',
    federation: '',
    DoB: ''
  })

  // Get Candidate to update
  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  useEffect(()=>{
    if(id){
      setFormsData({
        ...formsData,
        name: id
      })
    }
  }, [])

  return (
    <main className="signup-candidate-page center-page">
      <form className='signup-form' onSubmit={()=>{}}>
        <div className="form-field">
          <label htmlFor="name">Nome</label>
          <input 
            type="text" 
            name="name" 
            id="name" 
            autoComplete='name'
            required 
            value={formsData.name} 
            onChange={(e)=>
              setFormsData(
                {...formsData, name: e.target.value}
              )
            }
          />
        </div>

        <div className="form-field">
          <label htmlFor="party">Partido</label>
          <input 
            type="text" 
            name='party' 
            id='party' 
            required 
            value={formsData.party} 
            onChange={(e)=>
              setFormsData(
                {...formsData, party: e.target.value}
              )
            }
          />
        </div>

        <div className="form-field">
          <label htmlFor="federation">Federação</label>
          <input 
            type="text" 
            name='federation' 
            id='federation' 
            value={formsData.federation} 
            onChange={(e)=>
              setFormsData(
                {...formsData, federation: e.target.value}
              )
            }
          />
        </div>

        <div className="form-field">
          <label htmlFor="DoB">Data de Nascimento</label>
          <input 
            type="date" 
            name="DoB" 
            id="DoB" 
            required 
            value={formsData.DoB} 
            onChange={(e)=>
              setFormsData(
                {...formsData, DoB: e.target.value}
              )
            }
          />
        </div>

        <button type="submit">Salvar</button>
        
      </form>

    </main>
  )
}

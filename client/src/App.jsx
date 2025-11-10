import { useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function App() {
  const [form, setForm] = useState({ document: '', name: '', email: '', phone: '' });
  const [topup, setTopup] = useState({ document: '', phone: '', amountCents: 0 });
  const [pay, setPay] = useState({ document: '', phone: '', amountCents: 0 });
  const [confirm, setConfirm] = useState({ sessionId: '', token6: '' });
  const [balanceQ, setBalanceQ] = useState({ document: '', phone: '' });
  const [output, setOutput] = useState(null);

  const post = async (url, data) => {
    const { data: res } = await axios.post(`${API}${url}`, data);
    setOutput(res);
  };
  const get = async (url, params) => {
    const { data: res } = await axios.get(`${API}${url}`, { params });
    setOutput(res);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Wallet - Demo</h1>

      <section className="p-4 bg-white rounded shadow">
        <h2 className="font-semibold mb-3">1) Registrar cliente</h2>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Documento"
            value={form.document} onChange={e=>setForm({...form, document:e.target.value})}/>
          <input className="input" placeholder="Nombre"
            value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          <input className="input" placeholder="Email"
            value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
          <input className="input" placeholder="Teléfono"
            value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
        </div>
        <button className="btn mt-3" onClick={()=>post('/clients/register', form)}>Registrar</button>
      </section>

      <section className="p-4 bg-white rounded shadow">
        <h2 className="font-semibold mb-3">2) Recargar</h2>
        <div className="grid grid-cols-3 gap-2">
          <input className="input" placeholder="Documento"
            value={topup.document} onChange={e=>setTopup({...topup, document:e.target.value})}/>
          <input className="input" placeholder="Teléfono"
            value={topup.phone} onChange={e=>setTopup({...topup, phone:e.target.value})}/>
          <input className="input" placeholder="amountCents (ej 10000)"
            value={topup.amountCents} onChange={e=>setTopup({...topup, amountCents:Number(e.target.value)})}/>
        </div>
        <button className="btn mt-3" onClick={()=>post('/wallet/topup', topup)}>Recargar</button>
      </section>

      <section className="p-4 bg-white rounded shadow">
        <h2 className="font-semibold mb-3">3) Iniciar pago</h2>
        <div className="grid grid-cols-3 gap-2">
          <input className="input" placeholder="Documento"
            value={pay.document} onChange={e=>setPay({...pay, document:e.target.value})}/>
          <input className="input" placeholder="Teléfono"
            value={pay.phone} onChange={e=>setPay({...pay, phone:e.target.value})}/>
          <input className="input" placeholder="amountCents (ej 5000)"
            value={pay.amountCents} onChange={e=>setPay({...pay, amountCents:Number(e.target.value)})}/>
        </div>
        <button className="btn mt-3" onClick={()=>post('/payments/initiate', pay)}>Iniciar Pago</button>
        <p className="text-sm text-gray-500 mt-2">Revisa MailHog en http://localhost:8025 para ver el token.</p>
      </section>

      <section className="p-4 bg-white rounded shadow">
        <h2 className="font-semibold mb-3">Confirmar pago</h2>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="sessionId"
            value={confirm.sessionId} onChange={e=>setConfirm({...confirm, sessionId:e.target.value})}/>
          <input className="input" placeholder="token6"
            value={confirm.token6} onChange={e=>setConfirm({...confirm, token6:e.target.value})}/>
        </div>
        <button className="btn mt-3" onClick={()=>post('/payments/confirm', confirm)}>Confirmar</button>
      </section>

      <section className="p-4 bg-white rounded shadow">
        <h2 className="font-semibold mb-3">4) Consultar saldo</h2>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Documento"
            value={balanceQ.document} onChange={e=>setBalanceQ({...balanceQ, document:e.target.value})}/>
          <input className="input" placeholder="Teléfono"
            value={balanceQ.phone} onChange={e=>setBalanceQ({...balanceQ, phone:e.target.value})}/>
        </div>
        <button className="btn mt-3" onClick={()=>get('/wallet/balance', balanceQ)}>Consultar</button>
      </section>

      <section className="p-4 bg-white rounded shadow">
        <h2 className="font-semibold mb-3">Salida</h2>
        <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">{JSON.stringify(output, null, 2)}</pre>
      </section>

      <style>{`
        .input { @apply border rounded px-2 py-1 w-full; }
        .btn { @apply bg-black text-white rounded px-3 py-2 hover:opacity-80; }
      `}</style>
    </div>
  );
}

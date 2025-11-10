import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// 🔔 Componente de alerta superior
function AlertBar({ alert, onClose }) {
  if (!alert) return null;
  const color =
    alert.type === 'success'
      ? 'bg-green-100 text-green-800 border-green-300'
      : alert.type === 'warn'
      ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
      : 'bg-red-100 text-red-800 border-red-300'; // error por defecto

  return (
    <div
      className={`sticky top-0 z-50 border ${color} px-4 py-3 flex items-start gap-3`}
    >
      <div className="font-semibold mt-0.5">
        {alert.type === 'success'
          ? 'Éxito'
          : alert.type === 'warn'
          ? 'Aviso'
          : 'Error'}
      </div>
      <div className="text-sm whitespace-pre-wrap">{alert.message}</div>
      <button
        className="ml-auto text-sm underline"
        onClick={onClose}
        aria-label="Cerrar alerta"
      >
        Cerrar
      </button>
    </div>
  );
}

// 🧰 helpers simples
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '');
const isPositiveNumber = (v) => Number.isFinite(Number(v)) && Number(v) > 0;

export default function App() {
  const [alert, setAlert] = useState(null);
  const [output, setOutput] = useState(null);

  // Formularios
  const [form, setForm] = useState({
    document: '',
    name: '',
    email: '',
    phone: ''
  });
  const [topup, setTopup] = useState({
    document: '',
    phone: '',
    amountCents: ''
  });
  const [pay, setPay] = useState({ document: '', phone: '', amountCents: '' });
  const [confirm, setConfirm] = useState({ sessionId: '', token6: '' });
  const [balanceQ, setBalanceQ] = useState({ document: '', phone: '' });

  // ⏱️ ocultar alerta automáticamente
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(t);
  }, [alert]);

  // Muestra alertas arriba
  const showError = (msg) => setAlert({ type: 'error', message: msg });
  const showWarn = (msg) => setAlert({ type: 'warn', message: msg });
  const showOk = (msg) => setAlert({ type: 'success', message: msg });

  // 🔒 wrappers Axios con manejo de error/éxito
  const post = async (url, data) => {
    try {
      const { data: res } = await axios.post(`${API}${url}`, data);
      setOutput(res);
      setAlert({
        type: res?.success ? 'success' : 'warn',
        message: res?.message || 'Operación completada'
      });
    } catch (err) {
      const payload = err.response?.data;
      setOutput(payload || { success: false, message: err.message });
      const msg = Array.isArray(payload?.message)
        ? payload.message.join('\n')
        : payload?.message || err.message;
      setAlert({ type: 'error', message: msg });
    }
  };

  const get = async (url, params) => {
    try {
      const { data: res } = await axios.get(`${API}${url}`, { params });
      setOutput(res);
      setAlert({
        type: res?.success ? 'success' : 'warn',
        message: res?.message || 'Operación completada'
      });
    } catch (err) {
      const payload = err.response?.data;
      setOutput(payload || { success: false, message: err.message });
      const msg = Array.isArray(payload?.message)
        ? payload.message.join('\n')
        : payload?.message || err.message;
      setAlert({ type: 'error', message: msg });
    }
  };
  // ✅ validaciones cliente antes de llamar API
  const validateRegister = () => {
    const errors = [];
    if (!form.document.trim()) errors.push('Documento es requerido.');
    if (!form.name.trim()) errors.push('Nombre es requerido.');
    if (!isEmail(form.email)) errors.push('Email no es válido.');
    if (!form.phone.trim()) errors.push('Teléfono es requerido.');
    if (errors.length) {
      showError(errors.join('\n'));
      return false;
    }
    return true;
  };

  const validateTopup = () => {
    const errors = [];
    if (!topup.document.trim()) errors.push('Documento es requerido.');
    if (!topup.phone.trim()) errors.push('Teléfono es requerido.');
    if (!isPositiveNumber(topup.amountCents))
      errors.push('amountCents debe ser > 0.');
    if (errors.length) {
      showError(errors.join('\n'));
      return false;
    }
    return true;
  };

  const validatePay = () => {
    const errors = [];
    if (!pay.document.trim()) errors.push('Documento es requerido.');
    if (!pay.phone.trim()) errors.push('Teléfono es requerido.');
    if (!isPositiveNumber(pay.amountCents))
      errors.push('amountCents debe ser > 0.');
    if (errors.length) {
      showError(errors.join('\n'));
      return false;
    }
    return true;
  };

  const validateConfirm = () => {
    const errors = [];
    if (!confirm.sessionId.trim()) errors.push('sessionId es requerido.');
    if (!(confirm.token6 || '').trim() || String(confirm.token6).length !== 6)
      errors.push('token6 debe tener 6 dígitos.');
    if (errors.length) {
      showError(errors.join('\n'));
      return false;
    }
    return true;
  };

  const validateBalance = () => {
    const errors = [];
    if (!balanceQ.document.trim()) errors.push('Documento es requerido.');
    if (!balanceQ.phone.trim()) errors.push('Teléfono es requerido.');
    if (errors.length) {
      showError(errors.join('\n'));
      return false;
    }
    return true;
  };

  // 🎛️ UI
  return (
    <div className="min-h-screen bg-gray-50">
      <AlertBar alert={alert} onClose={() => setAlert(null)} />
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-bold">Wallet - Demo</h1>

        {/* Registro */}
        <section className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold mb-3">1) Registrar cliente</h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              placeholder="Documento"
              value={form.document}
              onChange={(e) => setForm({ ...form, document: e.target.value })}
            />
            <input
              className="input"
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="input"
              placeholder="Teléfono"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <button
            className="btn btn-primary mt-3"
            onClick={() =>
              validateRegister() &&
              post('/clients/register', form, 'Cliente registrado')
            }
          >
            Registrar
          </button>
        </section>

        {/* Recarga */}
        <section className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold mb-3">2) Recargar</h2>
          <div className="grid grid-cols-3 gap-2">
            <input
              className="input"
              placeholder="Documento"
              value={topup.document}
              onChange={(e) => setTopup({ ...topup, document: e.target.value })}
            />
            <input
              className="input"
              placeholder="Teléfono"
              value={topup.phone}
              onChange={(e) => setTopup({ ...topup, phone: e.target.value })}
            />
            <input
              className="input"
              placeholder="amountCents (ej 10000)"
              value={topup.amountCents}
              onChange={(e) =>
                setTopup({ ...topup, amountCents: e.target.value })
              }
            />
          </div>
          <button
            className="btn btn-success mt-3"
            onClick={() =>
              validateTopup() &&
              post(
                '/wallet/topup',
                { ...topup, amountCents: Number(topup.amountCents) },
                'Recarga exitosa'
              )
            }
          >
            Recargar
          </button>
        </section>

        {/* Iniciar pago */}
        <section className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold mb-3">3) Iniciar pago</h2>
          <div className="grid grid-cols-3 gap-2">
            <input
              className="input"
              placeholder="Documento"
              value={pay.document}
              onChange={(e) => setPay({ ...pay, document: e.target.value })}
            />
            <input
              className="input"
              placeholder="Teléfono"
              value={pay.phone}
              onChange={(e) => setPay({ ...pay, phone: e.target.value })}
            />
            <input
              className="input"
              placeholder="amountCents (ej 5000)"
              value={pay.amountCents}
              onChange={(e) => setPay({ ...pay, amountCents: e.target.value })}
            />
          </div>
          <button
            className="btn btn-warning mt-3"
            onClick={async () => {
              if (!validatePay()) return;
              try {
                const { data: res } = await axios.post(`${API}/payments/initiate`, {
                  ...pay,
                  amountCents: Number(pay.amountCents),
                });
                setOutput(res);
                setAlert({
                  type: res?.success ? 'success' : 'warn',
                  message: res?.message || 'Token enviado por email',
                });
                if (res?.sessionId) setConfirm((c) => ({ ...c, sessionId: res.sessionId }));
              } catch (err) {
                const payload = err.response?.data;
                setOutput(payload || { success: false, message: err.message });
                const msg = Array.isArray(payload?.message)
                  ? payload.message.join('\n')
                  : payload?.message || err.message;
                setAlert({ type: 'error', message: msg });
              }
            }}
          >
            Iniciar Pago
          </button>
          <p className="text-sm text-gray-500 mt-2">
            Revisa MailHog en{' '}
            <a
              className="underline"
              href="http://localhost:8025"
              target="_blank"
            >
              http://localhost:8025
            </a>{' '}
            para ver el token.
          </p>
        </section>

        {/* Confirmar pago */}
        <section className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold mb-3">Confirmar pago</h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              placeholder="sessionId"
              value={confirm.sessionId}
              onChange={(e) =>
                setConfirm({ ...confirm, sessionId: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="token6"
              value={confirm.token6}
              onChange={(e) =>
                setConfirm({ ...confirm, token6: e.target.value })
              }
            />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              className="btn btn-secondary"
              onClick={async () => {
                if (!confirm.sessionId.trim()) return showWarn('Ingresa sessionId');
                try {
                  const { data } = await axios.get(`${API}/payments/dev-token/${confirm.sessionId}`);
                  setOutput(data);
                  if (data?.data?.token6) {
                    setConfirm({ ...confirm, token6: data.data.token6 });
                    showOk('Token obtenido (solo dev)');
                  } else {
                    showWarn(data?.message || 'No se pudo obtener token');
                  }
                } catch (err) {
                  const msg = err.response?.data?.message || err.message;
                  showError(msg);
                }
              }}
            >
              Obtener token (dev)
            </button>
            <a className="underline text-sm" href="http://localhost:8025" target="_blank">Ver en MailHog</a>
          </div>
          <button
            className="btn btn-primary mt-3"
            onClick={() =>
              validateConfirm() &&
              post('/payments/confirm', confirm, 'Pago confirmado')
            }
          >
            Confirmar
          </button>
        </section>

        {/* Consultar saldo */}
        <section className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold mb-3">4) Consultar saldo</h2>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              placeholder="Documento"
              value={balanceQ.document}
              onChange={(e) =>
                setBalanceQ({ ...balanceQ, document: e.target.value })
              }
            />
            <input
              className="input"
              placeholder="Teléfono"
              value={balanceQ.phone}
              onChange={(e) =>
                setBalanceQ({ ...balanceQ, phone: e.target.value })
              }
            />
          </div>
          <button
            className="btn btn-secondary mt-3"
            onClick={() =>
              validateBalance() &&
              get('/wallet/balance', balanceQ, 'Saldo consultado')
            }
          >
            Consultar
          </button>
        </section>

        {/* Salida (debug) */}
        <section className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold mb-3">Salida</h2>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(output, null, 2)}
          </pre>
        </section>

        {/* estilos utilitarios definidos en index.css (Tailwind @apply) */}
      </div>
    </div>
  );
}

import { Logo } from '../../components/Layout';

export default function AuthLayout({ titulo, subtitulo, children, pie }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-sky-50 px-4 py-10">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="card w-full max-w-sm p-6 sm:p-7">
        <h1 className="text-xl font-semibold text-slate-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {pie && <div className="mt-5 text-center text-sm text-slate-600">{pie}</div>}
    </div>
  );
}

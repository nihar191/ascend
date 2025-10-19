import { useEffect, useState } from 'react';
import api from '../../services/api';

const AdminLeaguesPage = () => {
  const [leagues, setLeagues] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', minRating: 0, maxRating: '', icon: '🏆' });
  const [seasonForm, setSeasonForm] = useState({ leagueId: '', seasonNumber: 1, startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLeagues = async () => {
    try {
      const res = await api.get('/leagues');
      setLeagues(res.data.leagues || []);
    } catch (e) {
      setError('Failed to load leagues');
    }
  };

  useEffect(() => { loadLeagues(); }, []);

  const createLeague = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/leagues', {
        name: form.name,
        description: form.description,
        minRating: Number(form.minRating),
        maxRating: form.maxRating === '' ? null : Number(form.maxRating),
        icon: form.icon,
      });
      setForm({ name: '', description: '', minRating: 0, maxRating: '', icon: '🏆' });
      await loadLeagues();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create league');
    } finally {
      setLoading(false);
    }
  };

  const createSeason = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/leagues/seasons', {
        leagueId: Number(seasonForm.leagueId),
        seasonNumber: Number(seasonForm.seasonNumber),
        startDate: seasonForm.startDate,
        endDate: seasonForm.endDate,
      });
      setSeasonForm({ leagueId: '', seasonNumber: 1, startDate: '', endDate: '' });
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to create season');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="card">
        <h1 className="text-2xl font-bold">League Management</h1>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <form className="card space-y-3" onSubmit={createLeague}>
          <h2 className="font-semibold">Create League</h2>
          <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} required />
          <textarea className="input" placeholder="Description" value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" className="input" placeholder="Min Rating" value={form.minRating} onChange={e=>setForm(f=>({...f, minRating:e.target.value}))} required />
            <input type="number" className="input" placeholder="Max Rating (optional)" value={form.maxRating} onChange={e=>setForm(f=>({...f, maxRating:e.target.value}))} />
          </div>
          <input className="input" placeholder="Icon (emoji)" value={form.icon} onChange={e=>setForm(f=>({...f, icon:e.target.value}))} />
          <button disabled={loading} className="btn-primary">{loading ? 'Creating…' : 'Create League'}</button>
        </form>

        <form className="card space-y-3" onSubmit={createSeason}>
          <h2 className="font-semibold">Create Season</h2>
          <select className="input" value={seasonForm.leagueId} onChange={e=>setSeasonForm(f=>({...f, leagueId:e.target.value}))} required>
            <option value="">Select league…</option>
            {leagues.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <input type="number" className="input" placeholder="Season Number" value={seasonForm.seasonNumber} onChange={e=>setSeasonForm(f=>({...f, seasonNumber:e.target.value}))} required />
          <input type="date" className="input" value={seasonForm.startDate} onChange={e=>setSeasonForm(f=>({...f, startDate:e.target.value}))} required />
          <input type="date" className="input" value={seasonForm.endDate} onChange={e=>setSeasonForm(f=>({...f, endDate:e.target.value}))} required />
          <button disabled={loading} className="btn-primary">{loading ? 'Creating…' : 'Create Season'}</button>
        </form>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Existing Leagues</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {leagues.map(l => (
            <div key={l.id} className="p-4 border rounded">
              <div className="text-3xl">{l.icon}</div>
              <div className="font-bold">{l.name}</div>
              <div className="text-sm text-gray-600">{l.description}</div>
              <div className="text-xs text-gray-500 mt-1">Rating: {l.min_rating} - {l.max_rating ?? '∞'}</div>
            </div>
          ))}
          {leagues.length === 0 && <p className="text-gray-500 text-sm">No leagues yet</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminLeaguesPage;



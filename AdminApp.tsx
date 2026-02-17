import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, MapPin, Users, AlertTriangle, Bell, Settings, 
  Search, Plus, Save, Trash2, CheckCircle, XCircle, Map, LogOut, Loader2,
  Droplets, Edit2, Palette, Clock, BarChart3, Send
} from 'lucide-react';
import { Station, User, Report, FuelType, Brand, PriceRecord } from './types';
import { supabase } from './lib/supabase';
import OpenStreetMap from './components/OpenStreetMap';
import Button from './components/Button';

// Interfaces for UI state that might differ slightly from raw DB types
interface FuelDefinition {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

interface DashboardActivity {
  id: string;
  stationName: string;
  userName: string;
  fuelName: string;
  value: number;
  updatedAt: string;
}

interface AveragePrice {
    fuelName: string;
    avgPrice: number;
    count: number;
    color: string;
}

interface AdminAppProps {
  onLogout?: () => void;
}

const TAB_TITLES: Record<string, string> = {
  dashboard: 'Visão Geral',
  stations: 'Gerenciar Postos',
  users: 'Usuários',
  moderation: 'Moderação',
  notifications: 'Notificações',
  settings: 'Tipos de Combustíveis'
};

const AdminApp: React.FC<AdminAppProps> = ({ onLogout = () => {} }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stations' | 'users' | 'moderation' | 'notifications' | 'settings'>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  
  // --- Dashboard State ---
  const [stats, setStats] = useState({ users: 0, stations: 0, reports: 0 });
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([]);
  const [averagePrices, setAveragePrices] = useState<AveragePrice[]>([]);

  // --- Stations State ---
  const [stations, setStations] = useState<Station[]>([]);
  const [editingStation, setEditingStation] = useState<Partial<Station> | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: -8.285816, lng: -35.034964 });
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  
  // --- Deletion State ---
  const [stationToDelete, setStationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Users State ---
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // --- Moderation State ---
  const [reports, setReports] = useState<Report[]>([]);

  // --- Fuel Settings State ---
  const [fuels, setFuels] = useState<FuelDefinition[]>([]);
  const [editingFuel, setEditingFuel] = useState<Partial<FuelDefinition> | null>(null);

  // --- Notification State ---
  const [notificationTarget, setNotificationTarget] = useState<'all' | 'active'>('all');
  const [notificationCount, setNotificationCount] = useState<number | null>(null);

  // --- DATA FETCHING ---

  useEffect(() => {
    // Initial data load based on active tab
    if (activeTab === 'dashboard') loadDashboard();
    if (activeTab === 'stations') loadStations();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'moderation') loadReports();
    if (activeTab === 'settings') loadFuels();
    if (activeTab === 'notifications') calculateNotificationReach();
  }, [activeTab]);

  // Load dashboard data
  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      // Counts
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: stationCount } = await supabase.from('stations').select('*', { count: 'exact', head: true });
      const { count: reportCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');

      setStats({
        users: userCount || 0,
        stations: stationCount || 0,
        reports: reportCount || 0
      });

      // Recent Activity
      // Explicitly aliasing profiles:updated_by to ensure the join works correctly
      const { data: activityData, error: activityError } = await supabase
        .from('station_prices')
        .select(`
            id, 
            value, 
            updated_at, 
            stations (name), 
            profiles:updated_by (name), 
            fuel_types (name)
        `)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (activityError) {
          console.error("Error loading activity:", activityError);
      } else if (activityData) {
        setRecentActivity(activityData.map((item: any) => ({
          id: item.id,
          stationName: item.stations?.name || 'Posto Desconhecido',
          userName: item.profiles?.name || 'Usuário',
          fuelName: item.fuel_types?.name || 'Combustível',
          value: item.value,
          updatedAt: item.updated_at
        })));
      }

      // Calculate Average Prices (Real Data)
      const { data: priceData, error: priceError } = await supabase
        .from('station_prices')
        .select(`value, fuel_types (name, color)`);

      if (priceError) {
         console.error("Error loading prices:", priceError);
      } else if (priceData && priceData.length > 0) {
        const sums: Record<string, { sum: number, count: number, color: string }> = {};
        
        priceData.forEach((p: any) => {
            const fName = p.fuel_types?.name;
            const fColor = p.fuel_types?.color || '#ccc';
            if (fName) {
                if (!sums[fName]) sums[fName] = { sum: 0, count: 0, color: fColor };
                sums[fName].sum += p.value;
                sums[fName].count += 1;
            }
        });

        const averages: AveragePrice[] = Object.keys(sums).map(key => ({
            fuelName: key,
            avgPrice: sums[key].sum / sums[key].count,
            count: sums[key].count,
            color: sums[key].color
        })).sort((a,b) => b.count - a.count);

        setAveragePrices(averages);
      }

    } catch (error) {
      console.error("Dashboard load error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stations')
        .select(`*, station_prices (value, updated_at, updated_by, confirmations, fuel_types (name))`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedStations: Station[] = data.map((s: any) => {
          const pricesObj: Record<string, PriceRecord> = {};
          if (s.station_prices) {
            s.station_prices.forEach((p: any) => {
              if (p.fuel_types?.name) {
                pricesObj[p.fuel_types.name as FuelType] = {
                  value: p.value,
                  updatedAt: p.updated_at,
                  updatedBy: p.updated_by,
                  confirmations: p.confirmations
                };
              }
            });
          }

          return {
            id: s.id, name: s.name, brand: s.brand as Brand, address: s.address, coordinates: { lat: s.lat, lng: s.lng },
            prices: pricesObj, isFavorite: false
          };
        });
        setStations(mappedStations);
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (userSearch) query = query.or(`name.ilike.%${userSearch}%,email.ilike.%${userSearch}%`);
      const { data, error } = await query;
      if (error) throw error;
      if (data) setUsers(data.map((u: any) => ({
          id: u.id, name: u.name || 'Sem Nome', email: u.email, role: u.role, 
          reputation: u.reputation, contributions: u.contributions, status: u.status, joinedAt: u.created_at
      })));
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      const timeout = setTimeout(() => loadUsers(), 500);
      return () => clearTimeout(timeout);
    }
  }, [userSearch]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      // Explicit alias for reported_by to profiles
      const { data, error } = await supabase
        .from('reports')
        .select(`*, stations (name), profiles:reported_by (name)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setReports(data.map((r: any) => ({
          id: r.id, stationName: r.stations?.name || 'Posto Excluído', reportedBy: r.profiles?.name || 'Anônimo',
          reason: r.reason, status: r.status, createdAt: r.created_at
      })));
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const loadFuels = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('fuel_types').select('*').order('name');
      if (error) throw error;
      if (data) setFuels(data.map((f: any) => ({ id: f.id, name: f.name, color: f.color, isActive: f.is_active })));
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  // --- ACTIONS ---

  const getReverseGeocoding = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'User-Agent': 'TaNoPostoApp/1.0' }
      });
      const data = await response.json();
      if (data && data.address) {
        const road = data.address.road || data.address.pedestrian || '';
        const number = data.address.house_number || '';
        const suburb = data.address.suburb || data.address.city_district || '';
        const city = data.address.city || data.address.town || data.address.village || '';
        const parts = [road ? `${road}${number ? `, ${number}` : ''}` : '', suburb, city].filter(Boolean);
        return parts.length > 0 ? parts.join(' - ') : data.display_name;
      }
      return 'Endereço não identificado';
    } catch (error) { return 'Erro ao buscar endereço'; }
  };

  const handleStationMapClick = async (coords: { lat: number, lng: number }) => {
    const baseStation = editingStation || {
      id: '', name: '', brand: Brand.BRANCA, coordinates: coords, prices: {}
    };
    setEditingStation({ ...baseStation, coordinates: coords, address: 'Buscando endereço...' });
    setIsAddressLoading(true);
    const fetchedAddress = await getReverseGeocoding(coords.lat, coords.lng);
    setIsAddressLoading(false);
    setEditingStation(prev => prev ? { ...prev, coordinates: coords, address: fetchedAddress } : null);
  };

  const handleSaveStation = async () => {
    if (!editingStation || !editingStation.name || !editingStation.coordinates) {
      alert("Por favor, preencha o nome e selecione uma localização.");
      return;
    }
    try {
      // Get current user ID to set as creator/updater if needed
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        name: editingStation.name,
        brand: editingStation.brand,
        address: editingStation.address,
        lat: editingStation.coordinates.lat,
        lng: editingStation.coordinates.lng,
        is_verified: true,
        created_by: user?.id
      };

      if (editingStation.id) {
        const { error } = await supabase.from('stations').update(payload).eq('id', editingStation.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stations').insert([payload]);
        if (error) throw error;
      }
      alert('Posto salvo com sucesso!');
      setEditingStation(null);
      loadStations();
    } catch (err: any) { alert('Erro ao salvar posto: ' + err.message); }
  };

  const executeDeleteStation = async () => {
    if (!stationToDelete) return;
    
    setIsDeleting(true);
    try {
        const { error } = await supabase.from('stations').delete().eq('id', stationToDelete);
        
        if (error) {
             console.error("Erro detalhado do Supabase:", error);
             throw error;
        }
        
        // Atualização Otimista da UI
        setStations(currentStations => currentStations.filter(s => s.id !== stationToDelete));
        
        if (editingStation?.id === stationToDelete) {
             setEditingStation(null);
        }
        
        setStationToDelete(null); // Close modal
        
        // Recarrega em background para garantir consistência
        await loadStations();

    } catch (error: any) {
        console.error("Erro ao excluir:", error);
        alert('Erro ao excluir posto: ' + (error.message || 'Erro desconhecido'));
    } finally {
        setIsDeleting(false);
    }
  };

  const resolveReport = async (id: string, action: 'resolved' | 'dismissed') => {
    const { error } = await supabase.from('reports').update({ status: action }).eq('id', id);
    if (!error) setReports(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
  };

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    if (confirm(newStatus === 'banned' ? 'Banir este usuário?' : 'Reativar este usuário?')) {
      const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', user.id);
      if (!error) loadUsers();
      else alert('Erro ao atualizar usuário');
    }
  };

  const handleSaveFuel = async () => {
    if (!editingFuel || !editingFuel.name || !editingFuel.color) return alert("Nome e Cor obrigatórios.");
    try {
      const payload = { name: editingFuel.name, color: editingFuel.color, is_active: editingFuel.isActive };
      if (editingFuel.id) await supabase.from('fuel_types').update(payload).eq('id', editingFuel.id);
      else await supabase.from('fuel_types').insert([payload]);
      setEditingFuel(null);
      loadFuels();
    } catch (err) { alert('Erro ao salvar combustível'); }
  };

  const handleDeleteFuel = async (id: string) => {
    if (confirm('Tem certeza?')) {
      const { error } = await supabase.from('fuel_types').delete().eq('id', id);
      if (!error) loadFuels();
      else alert('Não é possível excluir combustíveis em uso.');
    }
  };

  const calculateNotificationReach = async () => {
      // Calculate how many users would receive this
      let query = supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (notificationTarget === 'active') {
          // Assuming active means status 'active'. 
          query = query.eq('status', 'active');
      }
      const { count } = await query;
      setNotificationCount(count || 0);
  };
  
  // Refresh count when target changes
  useEffect(() => {
      if (activeTab === 'notifications') calculateNotificationReach();
  }, [notificationTarget]);

  // --- RENDERERS ---

  const renderSidebar = () => (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col shadow-xl z-50">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
          Tá No Posto
        </h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Painel Admin</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <SidebarItem icon={<LayoutDashboard size={20} />} label="Visão Geral" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
        <SidebarItem icon={<MapPin size={20} />} label="Gerenciar Postos" active={activeTab === 'stations'} onClick={() => setActiveTab('stations')} />
        <SidebarItem icon={<Users size={20} />} label="Usuários" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
        <SidebarItem icon={<AlertTriangle size={20} />} label="Moderação" active={activeTab === 'moderation'} onClick={() => setActiveTab('moderation')} count={stats.reports} />
        <SidebarItem icon={<Bell size={20} />} label="Notificações" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
        <SidebarItem icon={<Droplets size={20} />} label="Combustíveis" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
            onClick={onLogout}
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors w-full px-4 py-2 rounded-lg hover:bg-slate-800"
        >
          <LogOut size={18} />
          <span>Sair do Admin</span>
        </button>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-800">Visão Geral</h2>
        {isLoading && <Loader2 className="animate-spin text-blue-600" />}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Usuários Totais" value={stats.users} icon={<Users className="text-blue-500" />} />
        <StatCard title="Postos Ativos" value={stats.stations} icon={<MapPin className="text-green-500" />} />
        <StatCard title="Denúncias" value={stats.reports} icon={<AlertTriangle className="text-orange-500" />} alert={stats.reports > 0} change={stats.reports > 0 ? "Ação Necessária" : "Tudo Certo"} />
        <StatCard title="Status do Sistema" value="Online" icon={<CheckCircle className="text-purple-500" />} change="Supabase Conectado" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96 overflow-y-auto">
          <h3 className="text-lg font-bold text-slate-800 mb-4 sticky top-0 bg-white pb-2 border-b border-slate-50">Atividade Recente</h3>
          <div className="space-y-4">
            {recentActivity.length === 0 ? <p className="text-slate-400 text-sm py-4 text-center">Nenhuma atividade recente.</p> : recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold uppercase">
                     {activity.userName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      <span className="font-bold">{activity.userName}</span> atualizou {activity.fuelName}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                       <MapPin size={10} /> {activity.stationName} • <Clock size={10} /> {new Date(activity.updatedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <span className="text-green-600 text-sm font-bold">R$ {activity.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Price Stats */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Média de Preços (Geral)</h3>
            <div className="space-y-4">
                {averagePrices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                        <BarChart3 size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">Sem dados de preços suficientes.</p>
                    </div>
                ) : averagePrices.map((avg) => (
                    <div key={avg.fuelName} className="space-y-1">
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-slate-700">{avg.fuelName}</span>
                            <span className="font-bold text-slate-900">R$ {avg.avgPrice.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                                className="h-full rounded-full" 
                                style={{ width: `${Math.min((avg.avgPrice / 10) * 100, 100)}%`, backgroundColor: avg.color }} 
                            />
                        </div>
                        <div className="text-[10px] text-slate-400 text-right">Baseado em {avg.count} registros</div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );

  const renderStationsManager = () => (
    <div className="flex h-[calc(100vh-100px)] gap-6 animate-in fade-in">
      <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Gerenciar Postos</h3>
          <Button size="sm" onClick={() => {
              setEditingStation({ id: '', name: '', brand: Brand.BRANCA, coordinates: mapCenter, prices: {} });
              // Small UX: move map slightly to indicate readiness or just toast
          }}>
            <Plus size={16} className="mr-1" /> Novo
          </Button>
        </div>

        {editingStation ? (
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
             <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800 mb-2 border border-blue-100">
                <div className="flex items-center font-bold mb-1">
                  <Map size={16} className="mr-2" />
                  Modo de Edição
                </div>
               <p>Clique no mapa para definir a localização exata.</p>
             </div>

             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Posto</label>
               <input 
                 className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                 placeholder="Ex: Auto Posto Central"
                 value={editingStation.name || ''} 
                 onChange={e => setEditingStation({...editingStation, name: e.target.value})}
                 autoFocus
               />
             </div>

             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bandeira</label>
               <select 
                 className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                 value={editingStation.brand}
                 onChange={e => setEditingStation({...editingStation, brand: e.target.value as Brand})}
               >
                 {Object.values(Brand).map(b => <option key={b} value={b}>{b}</option>)}
               </select>
             </div>

             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                 Endereço
                 {isAddressLoading && <span className="ml-2 text-blue-600 inline-flex items-center"><Loader2 size={10} className="animate-spin mr-1"/></span>}
               </label>
               <input 
                 className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-600 text-sm" 
                 value={editingStation.address || ''} 
                 onChange={e => setEditingStation({...editingStation, address: e.target.value})}
                 placeholder="Clique no mapa..."
                 readOnly
               />
             </div>
             
             <div className="flex gap-2 pt-6">
               <Button fullWidth onClick={handleSaveStation}>Salvar</Button>
               <Button variant="secondary" onClick={() => setEditingStation(null)}>Cancelar</Button>
             </div>
             
             {editingStation.id && (
                <Button 
                    type="button"
                    variant="danger" 
                    fullWidth 
                    className="mt-2" 
                    onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation();
                        // Direct call with ID from state to avoid closure staleness
                        if (editingStation.id) setStationToDelete(editingStation.id); 
                    }}
                    disabled={isDeleting}
                >
                    <Trash2 size={16} className="mr-2" />
                    Excluir Posto
                </Button>
             )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
             <div className="px-2 pb-2">
                <div className="flex items-center bg-slate-100 rounded-xl px-3 py-2 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                    <Search size={16} className="text-slate-400 mr-2" />
                    <input type="text" placeholder="Buscar posto..." className="bg-transparent text-sm w-full outline-none text-slate-700" />
                </div>
             </div>
             {stations.length === 0 ? (
               <div className="text-center py-12 text-slate-400 text-sm">
                   <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                   Nenhum posto encontrado
               </div>
             ) : (
               stations.map(station => (
                 <div 
                   key={station.id} 
                   onClick={() => { setEditingStation(station); setMapCenter(station.coordinates); }}
                   className="p-4 hover:bg-slate-50 rounded-xl cursor-pointer border border-transparent hover:border-slate-200 transition-all flex justify-between items-center group"
                 >
                   <div>
                      <h4 className="font-bold text-slate-800 text-sm">{station.name}</h4>
                      <span className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-slate-100 rounded-md mt-1 inline-block">{station.brand}</span>
                   </div>
                   <Edit2 size={16} className="text-slate-300 group-hover:text-blue-500" />
                 </div>
               ))
             )}
          </div>
        )}
      </div>

      <div className="flex-1 bg-slate-200 rounded-2xl overflow-hidden shadow-inner border border-slate-300 relative">
        <OpenStreetMap 
          stations={stations}
          userPosition={mapCenter}
          onMapClick={handleStationMapClick}
          onStationSelect={(s) => setEditingStation(s)}
          interactive={true}
        />
        {editingStation && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg z-[400] flex items-center animate-bounce">
                <MapPin size={14} className="mr-1" />
                Clique no mapa para posicionar
            </div>
        )}
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-slate-800">Gerenciar Usuários</h2>
         <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Nome ou email..." 
              className="border border-slate-300 rounded-xl px-4 py-2 text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
            {isLoading && <Loader2 className="animate-spin text-blue-600 self-center" />}
         </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reputação</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Criado em</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 uppercase text-xs">
                      {user.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.status === 'active' ? 'Ativo' : 'Banido'}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-600 font-medium">{user.reputation} pts</td>
                <td className="p-4 text-sm text-slate-600">{new Date(user.joinedAt).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleToggleUserStatus(user)} className={`${user.status === 'active' ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'} text-xs font-bold uppercase`}>
                    {user.status === 'active' ? 'Banir' : 'Reativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderModeration = () => (
    <div className="space-y-6 animate-in fade-in">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Moderação de Denúncias</h2>
        {isLoading && <Loader2 className="animate-spin text-blue-600" />}
       </div>
       <div className="grid gap-4">
         {reports.length === 0 ? (
           <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center text-slate-500">
              <CheckCircle size={48} className="mx-auto text-green-200 mb-4" />
              <p>Nenhuma denúncia pendente.</p>
           </div>
         ) : (
           reports.map(report => (
             <div key={report.id} className={`bg-white p-6 rounded-2xl shadow-sm border-l-4 ${report.status === 'pending' ? 'border-orange-500' : 'border-slate-200'} flex justify-between items-center`}>
                <div>
                   <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-slate-900">{report.stationName}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${report.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                          {report.status === 'pending' ? 'Pendente' : report.status === 'resolved' ? 'Resolvido' : 'Ignorado'}
                      </span>
                   </div>
                   <p className="text-sm text-slate-600 mb-1">Motivo: <span className="font-medium">{report.reason}</span></p>
                   <p className="text-xs text-slate-400">Reportado por: {report.reportedBy} • {new Date(report.createdAt).toLocaleDateString()}</p>
                </div>
                {report.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={() => resolveReport(report.id, 'resolved')}>
                       <CheckCircle size={16} className="mr-1" /> Resolver
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => resolveReport(report.id, 'dismissed')}>
                       <XCircle size={16} className="mr-1" /> Ignorar
                    </Button>
                  </div>
                )}
             </div>
           ))
         )}
       </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="max-w-2xl animate-in fade-in mx-auto mt-10">
       <h2 className="text-2xl font-bold text-slate-800 mb-6">Nova Notificação Push</h2>
       
       <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="space-y-6">
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Título da Mensagem</label>
                <input type="text" className="w-full border border-slate-300 rounded-xl p-4 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" placeholder="Ex: Gasolina baixou no centro!" />
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Conteúdo</label>
                <textarea className="w-full border border-slate-300 rounded-xl p-4 h-32 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" placeholder="Digite a mensagem para os usuários..." />
             </div>
             
             <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <label className="block text-sm font-bold text-blue-800 mb-3">Público Alvo</label>
                <div className="flex gap-4">
                   <label className="flex items-center space-x-3 cursor-pointer p-3 bg-white rounded-xl border border-blue-100 flex-1 hover:shadow-sm transition-shadow">
                      <input 
                        type="radio" 
                        name="target" 
                        checked={notificationTarget === 'all'} 
                        onChange={() => setNotificationTarget('all')}
                        className="text-blue-600 w-5 h-5" 
                      />
                      <span className="text-slate-700 font-medium">Todos</span>
                   </label>
                   <label className="flex items-center space-x-3 cursor-pointer p-3 bg-white rounded-xl border border-blue-100 flex-1 hover:shadow-sm transition-shadow">
                      <input 
                        type="radio" 
                        name="target" 
                        checked={notificationTarget === 'active'}
                        onChange={() => setNotificationTarget('active')}
                        className="text-blue-600 w-5 h-5" 
                      />
                      <span className="text-slate-700 font-medium">Apenas Ativos</span>
                   </label>
                </div>
                <div className="mt-4 text-xs text-blue-600 font-bold flex items-center">
                    <Users size={14} className="mr-1" />
                    Alcance Estimado: {notificationCount !== null ? `${notificationCount} usuários` : 'Calculando...'}
                </div>
             </div>

             <div className="pt-2">
                <Button size="lg" fullWidth onClick={() => alert(`Simulação: Notificação enviada para ${notificationCount} usuários.`)}>
                   <Send size={18} className="mr-2" /> Enviar Agora
                </Button>
             </div>
          </div>
       </div>
    </div>
  );

  const renderFuelSettings = () => (
    <div className="animate-in fade-in">
       <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Gerenciar Combustíveis</h2>
          <Button onClick={() => setEditingFuel({ name: '', color: '#3b82f6', isActive: true })}>
             <Plus size={18} className="mr-2" /> Novo Tipo
          </Button>
       </div>

       {isLoading && <Loader2 className="animate-spin text-blue-600 mb-4" />}

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fuels.map(fuel => (
             <div key={fuel.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: fuel.color }}>
                      <Droplets className="text-white/80 drop-shadow-sm" size={24} />
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-900">{fuel.name}</h3>
                      <div className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: fuel.color }}></div>
                         <span className="text-xs text-slate-500 uppercase tracking-wide">{fuel.color}</span>
                      </div>
                   </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => setEditingFuel(fuel)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 size={18} />
                   </button>
                   <button onClick={() => handleDeleteFuel(fuel.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                   </button>
                </div>
             </div>
          ))}
       </div>

       {editingFuel && (
         <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800">
                     {editingFuel.id ? 'Editar Combustível' : 'Novo Combustível'}
                  </h3>
                  <button onClick={() => setEditingFuel(null)} className="text-slate-400 hover:text-slate-600">
                     <XCircle size={28} />
                  </button>
               </div>
               
               <div className="space-y-6">
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Nome</label>
                     <input 
                        className="w-full border border-slate-300 rounded-xl p-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium"
                        placeholder="Ex: Gasolina Premium"
                        value={editingFuel.name || ''}
                        onChange={e => setEditingFuel({...editingFuel, name: e.target.value})}
                        autoFocus
                     />
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Cor</label>
                     <div className="flex gap-3">
                        <input 
                           type="color" 
                           className="h-14 w-20 rounded-xl cursor-pointer border border-slate-200 p-1 bg-white"
                           value={editingFuel.color || '#3b82f6'}
                           onChange={e => setEditingFuel({...editingFuel, color: e.target.value})}
                        />
                        <div className="flex-1 rounded-xl flex items-center px-4 text-sm font-bold text-white shadow-sm transition-colors" style={{ backgroundColor: editingFuel.color || '#3b82f6' }}>
                           Visualização da Cor
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex gap-3 mt-10">
                  <Button fullWidth onClick={handleSaveFuel} className="h-12 rounded-xl">
                     <Save size={18} className="mr-2" /> Salvar
                  </Button>
                  <Button fullWidth variant="secondary" onClick={() => setEditingFuel(null)} className="h-12 rounded-xl">
                     Cancelar
                  </Button>
               </div>
            </div>
         </div>
       )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {renderSidebar()}
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
           <h1 className="text-2xl font-bold text-slate-900 capitalize">{TAB_TITLES[activeTab] || activeTab}</h1>
           <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-xs font-bold text-slate-600">Sistema Online</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shadow-md border-2 border-slate-200">
                 AD
              </div>
           </div>
        </header>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'stations' && renderStationsManager()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'moderation' && renderModeration()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'settings' && renderFuelSettings()}
      
        {/* Delete Confirmation Modal */}
        {stationToDelete && (
            <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Excluir Posto?</h3>
                        <p className="text-slate-500 text-sm mt-2">
                            Esta ação é irreversível. O posto e todos os históricos de preços serão apagados.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button fullWidth variant="secondary" onClick={() => setStationToDelete(null)} disabled={isDeleting}>
                            Cancelar
                        </Button>
                        <Button fullWidth variant="danger" onClick={executeDeleteStation} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="animate-spin" /> : 'Sim, Excluir'}
                        </Button>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

// --- Helper Components ---

const SidebarItem = ({ icon, label, active, onClick, count }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all mb-1 ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-105' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <div className="flex items-center space-x-3">
      {icon}
      <span className="font-bold text-sm">{label}</span>
    </div>
    {count > 0 && (
      <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">{count}</span>
    )}
  </button>
);

const StatCard = ({ title, value, icon, change, alert }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-lg transition-all hover:-translate-y-1">
     <div className="flex justify-between items-start">
        <div>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">{title}</p>
           <h3 className={`text-4xl font-extrabold mt-2 ${alert ? 'text-orange-600' : 'text-slate-900'}`}>{value}</h3>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
           {icon}
        </div>
     </div>
     <div className="mt-auto">
        <span className={`text-xs font-bold ${alert ? 'text-orange-500' : 'text-green-600'} flex items-center bg-slate-50 w-fit px-2 py-1 rounded-lg`}>
           {change}
        </span>
     </div>
  </div>
);

export default AdminApp;
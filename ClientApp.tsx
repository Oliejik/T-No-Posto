import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Crosshair, AlertCircle, Loader2, Map as MapIcon, Heart, 
  User as UserIcon, ChevronRight, ChevronLeft, Bell, HelpCircle, 
  FileText, LogOut, Camera, Save, Navigation
} from 'lucide-react';
import { Station, FuelType, User as UserType, PriceRecord, Brand } from './types';
import { getDistance, INITIAL_STATIONS } from './services/mockData';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import OpenStreetMap from './components/OpenStreetMap';
import StationDetail from './components/StationDetail';
import UpdatePriceModal from './components/UpdatePriceModal';
import Button from './components/Button';

const FALLBACK_POSITION = { lat: -8.285816, lng: -35.034964 };

type ProfileView = 'menu' | 'edit' | 'notifications' | 'help' | 'terms';

interface ClientAppProps {
  onLogout?: () => void;
}

// --- Internal Styled Components ---

const ProfileHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="flex items-center px-6 py-5 bg-white border-b border-slate-100 sticky top-0 z-20 pt-safe-top">
    <button onClick={onBack} className="w-10 h-10 -ml-2 flex items-center justify-center text-slate-600 hover:bg-slate-50 rounded-full transition-colors active:scale-90">
      <ChevronLeft size={24} />
    </button>
    <h2 className="text-xl font-bold text-slate-800 ml-2 tracking-tight">{title}</h2>
  </div>
);

const SettingRow: React.FC<{ 
    icon: React.ReactNode; 
    label: string; 
    onClick: () => void; 
    colorClass: string;
    danger?: boolean; 
}> = ({ icon, label, onClick, colorClass, danger }) => (
    <button 
        onClick={onClick}
        className={`w-full bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-slate-100 active:scale-[0.98] transition-all group mb-3 ${danger ? 'border-red-100 bg-red-50/50' : ''}`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass} ${danger ? 'bg-red-100 text-red-600' : ''}`}>
                {icon}
            </div>
            <span className={`font-semibold ${danger ? 'text-red-600' : 'text-slate-700'}`}>{label}</span>
        </div>
        {!danger && <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500" />}
    </button>
);

// --- Sub-Screens ---

const EditProfile: React.FC<{ user: UserType; onSave: (u: Partial<UserType>) => void; onBack: () => void; }> = ({ user, onSave, onBack }) => {
  const [name, setName] = useState(user.name);
  return (
    <div className="h-full bg-slate-50 animate-in slide-in-from-right duration-300">
      <ProfileHeader title="Editar Perfil" onBack={onBack} />
      <div className="p-6">
        <div className="flex justify-center mb-8">
            <div className="relative group cursor-pointer">
                <div className="w-28 h-28 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-4xl font-bold border-4 border-white shadow-xl">
                    {user.name?.charAt(0) || 'U'}
                </div>
                <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2.5 rounded-full shadow-lg border-2 border-white">
                    <Camera size={16} />
                </div>
            </div>
        </div>
        <div className="space-y-5">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Nome Publico</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-4 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm" />
            </div>
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">E-mail</label>
                <input value={user.email} disabled className="w-full bg-slate-100 border border-slate-200 rounded-xl p-4 font-medium text-slate-500 shadow-inner" />
            </div>
        </div>
        <div className="mt-10">
          <Button fullWidth size="lg" className="h-14 rounded-xl shadow-lg shadow-blue-500/30" onClick={() => { onSave({ name }); onBack(); }}>
            <Save size={18} className="mr-2" /> Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

const ClientApp: React.FC<ClientAppProps> = ({ onLogout = () => {} }) => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedFuel, setSelectedFuel] = useState<FuelType | 'Todos'>('Todos');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [userPosition, setUserPosition] = useState(FALLBACK_POSITION);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'favorites' | 'profile'>('map');
  const [profileView, setProfileView] = useState<ProfileView>('menu');
  const [fuelTypesMap, setFuelTypesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    getCurrentLocation();
    if (isSupabaseConfigured) {
      fetchUser();
      fetchFuelTypes();
    } else {
      setStations(INITIAL_STATIONS);
    }
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured) loadStations();
  }, [userPosition]);

  const fetchFuelTypes = async () => {
    const { data } = await supabase.from('fuel_types').select('id, name');
    if (data) {
      const mapping: Record<string, string> = {};
      data.forEach((f: any) => mapping[f.name] = f.id);
      setFuelTypesMap(mapping);
    }
  };

  const fetchUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        if (profile) {
          setUser({
            id: authUser.id,
            name: profile.name,
            email: authUser.email || '',
            role: profile.role,
            reputation: profile.reputation,
            contributions: profile.contributions,
            status: profile.status,
            joinedAt: profile.created_at
          });
        }
      }
    } catch (e) { console.error(e); }
  };

  const loadStations = async () => {
    try {
      const { data: stationsData, error } = await supabase.from('stations').select(`*, station_prices (value, updated_at, updated_by, confirmations, fuel_types (name))`);
      if (error) throw error;

      let favoritesSet = new Set<string>();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
         const { data: favs } = await supabase.from('user_favorites').select('station_id').eq('user_id', authUser.id);
         if (favs) favs.forEach((f: any) => favoritesSet.add(f.station_id));
      }

      if (stationsData) {
        setStations(stationsData.map((s: any) => {
          const pricesObj: any = {};
          s.station_prices?.forEach((p: any) => {
            if (p.fuel_types?.name) pricesObj[p.fuel_types.name] = { value: p.value, updatedAt: p.updated_at, updatedBy: p.updated_by, confirmations: p.confirmations };
          });
          return {
            id: s.id, name: s.name, brand: s.brand as Brand, address: s.address, coordinates: { lat: s.lat, lng: s.lng },
            prices: pricesObj, isFavorite: favoritesSet.has(s.id), distance: getDistance(userPosition.lat, userPosition.lng, s.lat, s.lng)
          };
        }));
      }
    } catch (e) { console.error(e); }
  };

  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { 
            setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }); 
            setIsLoadingLocation(false); 
        },
        (error) => {
            console.warn("Geolocation error:", error);
            // On error (or permission denied), stop loading and stick to fallback/last known
            setIsLoadingLocation(false);
        }, 
        { 
            enableHighAccuracy: true,
            // Critical: add a timeout so it doesn't hang indefinitely on mobile
            timeout: 10000, 
            maximumAge: 60000 
        }
      );
    } else {
        setIsLoadingLocation(false);
    }
  };

  const handlePriceUpdate = async (stationId: string, fuelType: FuelType, price: number) => {
    if (!user || !isSupabaseConfigured) return;
    try {
      const fuelId = fuelTypesMap[fuelType];
      if (!fuelId) return alert('Combustível não mapeado');
      await supabase.from('station_prices').upsert({ station_id: stationId, fuel_type_id: fuelId, value: price, updated_by: user.id, updated_at: new Date().toISOString(), confirmations: 0 }, { onConflict: 'station_id, fuel_type_id' });
      await supabase.from('profiles').update({ contributions: (user.contributions || 0) + 1 }).eq('id', user.id);
      await loadStations();
      alert('Preço atualizado!');
    } catch (e) { alert('Erro ao atualizar'); }
  };

  const handleToggleFavorite = async (stationId: string) => {
     if (!user || !isSupabaseConfigured) return;
     const station = stations.find(s => s.id === stationId);
     if (!station) return;
     try {
        if (station.isFavorite) await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('station_id', stationId);
        else await supabase.from('user_favorites').insert({ user_id: user.id, station_id: stationId });
        setStations(prev => prev.map(s => s.id === stationId ? { ...s, isFavorite: !station.isFavorite } : s));
        if (selectedStation?.id === stationId) setSelectedStation(prev => prev ? ({ ...prev, isFavorite: !station.isFavorite }) : null);
     } catch (e) { console.error(e); }
  };

  const handleUpdateUser = async (updatedData: Partial<UserType>) => {
    if (!user || !isSupabaseConfigured) return;
    try {
        const { error } = await supabase.from('profiles').update(updatedData).eq('id', user.id);
        if (error) throw error;
        setUser(prev => prev ? { ...prev, ...updatedData } : null);
        alert('Perfil atualizado com sucesso!');
    } catch (e: any) {
        console.error(e);
        alert('Erro ao atualizar perfil: ' + e.message);
    }
  };

  const handleReportStation = async (stationId: string, reason: string) => {
    if (!user || !isSupabaseConfigured) {
        alert("Você precisa estar logado para reportar.");
        return;
    }
    try {
        const { error } = await supabase.from('reports').insert({
            station_id: stationId,
            reported_by: user.id,
            reason: reason,
            status: 'pending'
        });
        if (error) throw error;
        alert('Problema reportado com sucesso. Obrigado!');
    } catch (e: any) {
        console.error(e);
        alert('Erro ao enviar report: ' + e.message);
    }
  };

  const renderProfileMenu = () => (
    <div className="absolute inset-0 bg-slate-50 z-10 pt-safe-top px-6 overflow-y-auto pb-32 animate-in fade-in">
        <div className="mt-8 mb-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-blue-500/20 mb-4">
                {user?.name?.charAt(0) || 'U'}
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{user?.name}</h2>
            <p className="text-slate-500 font-medium">{user?.email}</p>
            
            <div className="flex gap-4 justify-center mt-6">
                <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 min-w-[100px]">
                    <div className="text-2xl font-bold text-slate-800">{user?.reputation}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Reputação</div>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 min-w-[100px]">
                    <div className="text-2xl font-bold text-slate-800">{user?.contributions}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Contribuições</div>
                </div>
            </div>
        </div>

        <h3 className="text-xs font-bold text-slate-400 uppercase ml-2 mb-3">Sua Conta</h3>
        <SettingRow icon={<UserIcon size={20} />} label="Editar Perfil" colorClass="bg-blue-100 text-blue-600" onClick={() => setProfileView('edit')} />
        <SettingRow icon={<Bell size={20} />} label="Notificações" colorClass="bg-purple-100 text-purple-600" onClick={() => setProfileView('notifications')} />
        
        <h3 className="text-xs font-bold text-slate-400 uppercase ml-2 mb-3 mt-6">Suporte</h3>
        <SettingRow icon={<HelpCircle size={20} />} label="Ajuda e Suporte" colorClass="bg-green-100 text-green-600" onClick={() => setProfileView('help')} />
        <SettingRow icon={<FileText size={20} />} label="Termos de Uso" colorClass="bg-orange-100 text-orange-600" onClick={() => setProfileView('terms')} />
        
        <div className="mt-8">
            <SettingRow icon={<LogOut size={20} />} label="Sair da Conta" colorClass="" danger onClick={() => { if(confirm('Sair?')) onLogout(); }} />
        </div>
    </div>
  );

  return (
    <div className="w-full h-full bg-slate-100 flex justify-center">
      <div className="w-full h-full max-w-[480px] bg-slate-50 relative shadow-2xl overflow-hidden flex flex-col">
        
        {/* Loading Overlay */}
        {isLoadingLocation && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-600 font-semibold animate-pulse">Buscando satélites...</p>
            <p className="text-slate-400 text-xs mt-2">Isso pode levar alguns segundos</p>
          </div>
        )}

        {/* --- Map View --- */}
        <div className="absolute inset-0 z-0">
             <OpenStreetMap 
                stations={activeTab === 'favorites' ? stations.filter(s => s.isFavorite) : stations} 
                selectedFuel={selectedFuel} 
                onStationSelect={setSelectedStation}
                userPosition={userPosition}
            />
        </div>

        {/* --- Top Controls (Float) --- */}
        {activeTab !== 'profile' && (
            <div className="absolute top-0 left-0 right-0 z-10 pt-safe-top pointer-events-none">
                <div className="px-4 py-2 bg-gradient-to-b from-white/90 via-white/50 to-transparent pb-6">
                    {/* Search */}
                    <div className="pointer-events-auto shadow-lg shadow-slate-200/50 rounded-2xl bg-white/95 backdrop-blur-sm flex items-center p-3 mb-3 border border-slate-100 transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
                        <Search size={20} className="text-slate-400 ml-1" />
                        <input type="text" placeholder="Buscar posto, endereço..." className="w-full ml-3 outline-none text-slate-700 bg-transparent placeholder:text-slate-400 font-medium" />
                    </div>
                    {/* Filters */}
                    <div className="pointer-events-auto flex gap-2 overflow-x-auto hide-scrollbar pb-1 px-1 -mx-1">
                        {[ 'Todos', FuelType.GASOLINA_COMUM, FuelType.GASOLINA_ADITIVADA, FuelType.ETANOL, FuelType.DIESEL_S10, FuelType.GNV ].map(fuel => (
                            <button key={fuel} onClick={() => setSelectedFuel(fuel as any)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold shadow-sm whitespace-nowrap transition-all border ${selectedFuel === fuel ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30' : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'}`}>
                                {fuel}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* --- Floating Actions --- */}
        {activeTab !== 'profile' && (
            <div className="absolute bottom-24 right-4 flex flex-col gap-3 z-10 pointer-events-none">
                <button onClick={getCurrentLocation} className="pointer-events-auto w-12 h-12 bg-white rounded-2xl shadow-lg shadow-slate-300/50 text-slate-700 flex items-center justify-center hover:bg-slate-50 active:scale-90 transition-all">
                    <Crosshair size={24} />
                </button>
                <button className="pointer-events-auto w-14 h-14 bg-red-500 rounded-2xl shadow-xl shadow-red-500/40 text-white flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all animate-pulse">
                    <AlertCircle size={28} />
                </button>
            </div>
        )}

        {/* --- Profile Screens --- */}
        {activeTab === 'profile' && user && (
            <div className="absolute inset-0 z-20 bg-slate-50">
                {profileView === 'menu' && renderProfileMenu()}
                {profileView === 'edit' && <EditProfile user={user} onSave={handleUpdateUser} onBack={() => setProfileView('menu')} />}
                {/* Fallback for other settings to menu for visual brevity in this refactor */}
                {['notifications','help','terms'].includes(profileView) && (
                    <div className="h-full bg-slate-50 pt-safe-top">
                        <ProfileHeader title={profileView.charAt(0).toUpperCase() + profileView.slice(1)} onBack={() => setProfileView('menu')} />
                        <div className="p-8 text-center text-slate-400 mt-10">Conteúdo da tela de {profileView}...</div>
                    </div>
                )}
            </div>
        )}

        {/* --- Bottom Dock --- */}
        <div className="absolute bottom-6 left-6 right-6 h-16 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl shadow-slate-300/50 z-30 flex justify-around items-center border border-white/50 pb-safe">
             <NavButton active={activeTab === 'map'} icon={<MapIcon size={24} />} onClick={() => setActiveTab('map')} />
             <NavButton active={activeTab === 'favorites'} icon={<Heart size={24} />} onClick={() => setActiveTab('favorites')} />
             <NavButton active={activeTab === 'profile'} icon={<UserIcon size={24} />} onClick={() => setActiveTab('profile')} />
        </div>

        {/* --- Station Detail Sheet --- */}
        {selectedStation && (
            <div className="absolute inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity" onClick={() => setSelectedStation(null)}>
                <StationDetail 
                    station={selectedStation} 
                    onClose={() => setSelectedStation(null)}
                    onUpdatePrice={() => setShowUpdateModal(true)}
                    isLoggedIn={!!user}
                    userLocation={userPosition}
                    onToggleFavorite={() => handleToggleFavorite(selectedStation.id)}
                    onReport={(reason) => handleReportStation(selectedStation.id, reason)}
                />
            </div>
        )}

        {/* --- Update Modal --- */}
        {showUpdateModal && selectedStation && (
            <UpdatePriceModal station={selectedStation} onClose={() => setShowUpdateModal(false)} onUpdate={handlePriceUpdate} />
        )}

      </div>
    </div>
  );
};

const NavButton = ({ active, icon, onClick }: any) => (
    <button onClick={onClick} className={`p-3 rounded-2xl transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
        {icon}
    </button>
);

export default ClientApp;
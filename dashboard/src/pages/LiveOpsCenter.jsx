import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import {
  Truck, Bot, Activity, User, MapPin, Clock, Battery, ChevronRight,
  AlertTriangle, CheckCircle, Navigation, Eye, RefreshCw
} from 'lucide-react';
import api from '../services/api';
import Header from '../components/common/Header';
import AlertBadge from '../components/common/AlertBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useSocketEvent } from '../hooks/useSocket';
import { timeAgo, formatTime } from '../utils/helpers';
import JobDetailModal from '../components/common/JobDetailModal';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DOHA_CENTER = [25.2854, 51.531];

function pinSvg(fill) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z" fill="${fill}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="6" fill="#fff"/></svg>`;
}

function createIcon(color) {
  return new L.DivIcon({
    className: '',
    html: pinSvg(color),
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

function createLabelIcon(color, label) {
  return new L.DivIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center">${pinSvg(color)}<span style="margin-top:2px;font-size:11px;font-weight:700;color:#333;background:#fff;padding:2px 8px;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.25);white-space:nowrap;line-height:1.2">${label}</span></div>`,
    iconSize: [120, 56],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

const customerIcon = createIcon('#f59e0b');
const robotMapIcon = createIcon('#22c55e');
const vehicleMapIcon = createIcon('#3b82f6');

export default function LiveOpsCenter() {
  const [vehicles, setVehicles] = useState([]);
  const [robots, setRobots] = useState([]);
  const [operators, setOperators] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [locationHistory, setLocationHistory] = useState({});
  const [loading, setLoading] = useState(true);

  // UI state
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('operators'); // operators | fleet | feed
  const [showCustomers, setShowCustomers] = useState(true);
  const [viewJobId, setViewJobId] = useState(null);
  const [showTrails, setShowTrails] = useState(true);
  const mapRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [vehiclesRes, robotsRes, operatorsRes, jobsRes, customersRes, activityRes] = await Promise.all([
        api.get('/location/vehicles'),
        api.get('/robots'),
        api.get('/users/operators'),
        api.get('/jobs/today'),
        api.get('/customers', { params: { limit: 100 } }),
        api.get('/activity', { params: { limit: 30 } }),
      ]);

      setVehicles(vehiclesRes.data || []);
      const robotData = robotsRes.data?.data || robotsRes.data || [];
      setRobots(robotData);
      setOperators(operatorsRes.data || []);
      setJobs(jobsRes.data || []);
      setCustomers((customersRes.data?.data || customersRes.data || []).filter(c => c.latitude && c.longitude));
      setActivity(activityRes.data?.data || activityRes.data || []);
    } catch (err) {
      console.error('Failed to load ops data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch location history for selected operator's vehicle
  useEffect(() => {
    if (!selectedOperator) return;
    const vehicle = getOperatorVehicle(selectedOperator.id);
    if (!vehicle) return;

    api.get(`/location/history/vehicle/${vehicle.id}`, { params: { limit: 200 } })
      .then(({ data }) => {
        const points = (data || []).map(p => [p.latitude, p.longitude]).filter(p => p[0] && p[1]);
        setLocationHistory(prev => ({ ...prev, [vehicle.id]: points }));
      })
      .catch(() => {});
  }, [selectedOperator]);

  // Real-time updates
  useSocketEvent('vehicle:location', useCallback((data) => {
    setVehicles(prev => {
      const idx = prev.findIndex(v => v.id === data.vehicleId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], latitude: data.lat, longitude: data.lng };
        return updated;
      }
      return prev;
    });
  }, []));

  useSocketEvent('job:status_changed', useCallback(() => {
    api.get('/jobs/today').then(({ data }) => setJobs(data || [])).catch(() => {});
  }, []));

  useSocketEvent('activity:new', useCallback((entry) => {
    setActivity(prev => [entry, ...prev].slice(0, 50));
  }, []));

  // Helper functions
  function getOperatorJobs(operatorId) {
    return jobs.filter(j => j.assigned_operator_id === operatorId);
  }

  function getOperatorActiveJob(operatorId) {
    return jobs.find(j => j.assigned_operator_id === operatorId && !['completed', 'cancelled', 'failed'].includes(j.status));
  }

  function getOperatorVehicle(operatorId) {
    const job = getOperatorJobs(operatorId).find(j => j.assigned_vehicle_id);
    if (job) return vehicles.find(v => v.id === job.assigned_vehicle_id);
    return vehicles.find(v => v.assigned_driver_id === operatorId);
  }

  function getOperatorRobot(operatorId) {
    const job = getOperatorActiveJob(operatorId);
    if (job?.assigned_robot_id) return robots.find(r => r.id === job.assigned_robot_id);
    return null;
  }

  function focusOnMap(lat, lng) {
    if (mapRef.current && lat && lng) {
      mapRef.current.flyTo([lat, lng], 15, { duration: 1 });
    }
  }

  // Stats
  const activeJobs = jobs.filter(j => ['en_route', 'arrived', 'in_progress'].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const lateJobs = jobs.filter(j => {
    if (!j.arrival_time || !j.scheduled_time) return false;
    const scheduled = new Date(`${j.scheduled_date}T${j.scheduled_time}`);
    return new Date(j.arrival_time) - scheduled > 15 * 60 * 1000;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-screen">
      <Header title="Live Ops Center" />

      {/* KPI Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-semibold text-gray-700">Live</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <User size={14} /> <span className="font-semibold">{operators.length}</span> Operators
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <Truck size={14} /> <span className="font-semibold">{vehicles.filter(v => v.latitude).length}/{vehicles.length}</span> Vehicles
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <Bot size={14} /> <span className="font-semibold">{robots.filter(r => r.status === 'deployed').length}/{robots.length}</span> Robots
        </div>
        <div className="flex items-center gap-1.5 text-blue-600">
          <Navigation size={14} /> <span className="font-semibold">{activeJobs.length}</span> Active
        </div>
        <div className="flex items-center gap-1.5 text-green-600">
          <CheckCircle size={14} /> <span className="font-semibold">{completedJobs.length}</span> Done
        </div>
        {lateJobs.length > 0 && (
          <div className="flex items-center gap-1.5 text-red-600">
            <AlertTriangle size={14} /> <span className="font-semibold">{lateJobs.length}</span> Late
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-gray-500 cursor-pointer">
            <input type="checkbox" checked={showCustomers} onChange={e => setShowCustomers(e.target.checked)} className="rounded" />
            <MapPin size={12} /> Customers
          </label>
          <label className="flex items-center gap-1.5 text-gray-500 cursor-pointer">
            <input type="checkbox" checked={showTrails} onChange={e => setShowTrails(e.target.checked)} className="rounded" />
            <Navigation size={12} /> Trails
          </label>
          <button onClick={fetchData} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Refresh">
            <RefreshCw size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer center={DOHA_CENTER} zoom={12} className="h-full w-full" ref={mapRef}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Customer markers */}
            {showCustomers && customers.map(c => (
              <Marker key={`cust-${c.id}`} position={[c.latitude, c.longitude]} icon={customerIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{c.company_name}</p>
                    <p className="text-gray-500">{c.address}</p>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Vehicle markers with operator labels */}
            {vehicles.map(v => {
              if (!v.latitude || !v.longitude) return null;
              const op = operators.find(o => {
                const job = jobs.find(j => j.assigned_vehicle_id === v.id && j.assigned_operator_id === o.id);
                return job || v.assigned_driver_id === o.id;
              });
              const isSelected = selectedOperator && op?.id === selectedOperator.id;
              const icon = op
                ? createLabelIcon(isSelected ? '#ef4444' : '#3b82f6', `${op.first_name} - ${v.name}`)
                : createIcon('#3b82f6');

              return (
                <Marker key={v.id} position={[v.latitude, v.longitude]} icon={icon}>
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[180px]">
                      <p className="font-bold text-base">{v.name}</p>
                      <p className="text-gray-600">Plate: {v.plate_number}</p>
                      {op && <p className="text-gray-600">Operator: {op.first_name} {op.last_name}</p>}
                      {(() => {
                        const activeJob = op ? getOperatorActiveJob(op.id) : null;
                        const robot = op ? getOperatorRobot(op.id) : null;
                        return (
                          <>
                            {activeJob && (
                              <div className="mt-1 pt-1 border-t border-gray-200">
                                <p className="text-gray-800 font-medium">{activeJob.Customer?.company_name || 'Job'}</p>
                                <p className="text-gray-500">{activeJob.service_type} - <span className="font-medium">{activeJob.status}</span></p>
                              </div>
                            )}
                            {robot && (
                              <div className="mt-1 pt-1 border-t border-gray-200">
                                <p className="text-gray-600">Robot: {robot.name} ({robot.battery_level}%)</p>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Robot markers */}
            {robots.map(r => {
              if (!r.latitude || !r.longitude) return null;
              return (
                <Marker key={`robot-${r.id}`} position={[r.latitude, r.longitude]} icon={robotMapIcon}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-gray-500">{r.serial_number} | {r.status} | {r.battery_level}%</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Location history trails */}
            {showTrails && Object.entries(locationHistory).map(([vehicleId, points]) => (
              points.length > 1 && (
                <Polyline key={`trail-${vehicleId}`} positions={points} color="#3b82f6" weight={3} opacity={0.6} dashArray="8 4" />
              )
            ))}
          </MapContainer>

          {/* Map legend */}
          <div className="absolute bottom-4 left-4 bg-white/95 rounded-lg shadow-lg p-3 z-[1000] text-xs space-y-1.5">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /> Vehicle / Operator</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /> Robot</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /> Customer</div>
            {showTrails && <div className="flex items-center gap-2"><div className="w-6 border-t-2 border-dashed border-blue-500" /> Route Trail</div>}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[340px] border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {[
              { id: 'operators', label: 'Operators', icon: User },
              { id: 'fleet', label: 'Fleet', icon: Truck },
              { id: 'feed', label: 'Feed', icon: Activity },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSidebarTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  sidebarTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'operators' && (
              <div className="divide-y divide-gray-100">
                {operators.map(op => {
                  const opJobs = getOperatorJobs(op.id);
                  const activeJob = getOperatorActiveJob(op.id);
                  const vehicle = getOperatorVehicle(op.id);
                  const robot = getOperatorRobot(op.id);
                  const isSelected = selectedOperator?.id === op.id;

                  return (
                    <div
                      key={op.id}
                      onClick={() => {
                        setSelectedOperator(isSelected ? null : op);
                        if (!isSelected && vehicle?.latitude) focusOnMap(vehicle.latitude, vehicle.longitude);
                      }}
                      className={`p-3 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-l-3 border-l-blue-600' : 'hover:bg-gray-50'}`}
                    >
                      {/* Operator header */}
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${activeJob ? 'bg-blue-600' : 'bg-gray-400'}`}>
                          {op.first_name?.[0]}{op.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{op.first_name} {op.last_name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {vehicle ? `${vehicle.name} (${vehicle.plate_number})` : 'No vehicle'}
                          </p>
                        </div>
                        {activeJob && <AlertBadge status={activeJob.status} />}
                        <ChevronRight size={14} className={`text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                      </div>

                      {/* Expanded details */}
                      {isSelected && (
                        <div className="mt-3 space-y-2 text-xs">
                          {/* Robot info */}
                          {robot && (
                            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                              <Bot size={14} className="text-green-600" />
                              <span className="text-green-800 font-medium">{robot.name}</span>
                              <span className="text-green-600">{robot.serial_number}</span>
                              <div className="ml-auto flex items-center gap-1">
                                <Battery size={12} className="text-green-600" />
                                <span className="text-green-700 font-medium">{robot.battery_level}%</span>
                              </div>
                            </div>
                          )}

                          {/* Active job */}
                          {activeJob && (
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-blue-900">{activeJob.Customer?.company_name || activeJob.service_type}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); window.location.href = `/jobs`; }}
                                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
                                >
                                  <Eye size={12} /> View
                                </button>
                              </div>
                              <p className="text-blue-700 mt-0.5">{activeJob.service_type} at {formatTime(activeJob.scheduled_time)}</p>
                              {activeJob.Customer?.address && (
                                <p className="text-blue-600 mt-0.5 flex items-center gap-1">
                                  <MapPin size={10} /> {activeJob.Customer.address}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Job list summary */}
                          <div className="flex items-center gap-3 text-gray-500 px-1">
                            <span>{opJobs.filter(j => j.status === 'completed').length} done</span>
                            <span>{opJobs.filter(j => !['completed','cancelled','failed'].includes(j.status)).length} remaining</span>
                            <span>{opJobs.length} total</span>
                          </div>

                          {/* All jobs for this operator */}
                          <div className="space-y-1">
                            {opJobs.map(j => (
                              <div key={j.id} className={`flex items-center gap-2 p-1.5 rounded ${j.id === activeJob?.id ? 'bg-white shadow-sm' : ''}`}>
                                {j.status === 'completed' ? (
                                  <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
                                ) : j.id === activeJob?.id ? (
                                  <Navigation size={13} className="text-blue-500 flex-shrink-0" />
                                ) : (
                                  <Clock size={13} className="text-gray-400 flex-shrink-0" />
                                )}
                                <span className={`truncate ${j.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                  {j.Customer?.company_name || j.service_type}
                                </span>
                                <span className="ml-auto text-gray-400 flex-shrink-0">{formatTime(j.scheduled_time)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {sidebarTab === 'fleet' && (
              <div className="p-3 space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicles</h4>
                {vehicles.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => v.latitude && focusOnMap(v.latitude, v.longitude)}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{v.name}</p>
                      <p className="text-xs text-gray-500">{v.plate_number} {v.last_location_update ? `| ${timeAgo(v.last_location_update)}` : ''}</p>
                    </div>
                    <AlertBadge status={v.status} />
                  </div>
                ))}

                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4">Robots</h4>
                {robots.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-500">{r.serial_number} | <Battery size={10} className="inline" /> {r.battery_level ?? '-'}%</p>
                    </div>
                    <AlertBadge status={r.status} />
                  </div>
                ))}
              </div>
            )}

            {sidebarTab === 'feed' && (
              <div className="p-3 space-y-2">
                {activity.map((entry, i) => (
                  <div
                    key={entry.id || i}
                    onClick={() => entry.entity_type === 'job' && entry.entity_id && setViewJobId(entry.entity_id)}
                    className={`border-l-2 border-gray-200 pl-3 py-1.5 rounded-r-lg ${entry.entity_type === 'job' && entry.entity_id ? 'hover:bg-blue-50 cursor-pointer' : 'hover:bg-gray-50'}`}
                  >
                    <p className="text-sm text-gray-800 font-medium">{entry.action?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{entry.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(entry.created_at || entry.createdAt || entry.timestamp)}</p>
                  </div>
                ))}
                {activity.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">No recent activity</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <JobDetailModal
        isOpen={!!viewJobId}
        onClose={() => setViewJobId(null)}
        jobId={viewJobId}
      />
    </div>
  );
}

import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Truck, Bot, Activity } from 'lucide-react';
import api from '../services/api';
import Header from '../components/common/Header';
import AlertBadge from '../components/common/AlertBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useSocketEvent } from '../hooks/useSocket';
import { timeAgo } from '../utils/helpers';

// Fix default marker icon paths for Leaflet + bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DOHA_CENTER = [25.2854, 51.531];

const vehicleIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.3)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const robotIcon = new L.DivIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.3)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function LiveOpsCenter() {
  const [vehicles, setVehicles] = useState([]);
  const [robots, setRobots] = useState([]);
  const [fleetStats, setFleetStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [vehiclesRes, robotsRes, statsRes, activityRes] = await Promise.all([
        api.get('/location/vehicles'),
        api.get('/robots'),
        api.get('/analytics/overview'),
        api.get('/activity', { params: { limit: 20 } }),
      ]);

      setVehicles(vehiclesRes.data || []);
      setRobots(robotsRes.data.data || robotsRes.data || []);
      setFleetStats(statsRes.data);
      setActivity(activityRes.data.data || activityRes.data || []);
    } catch (err) {
      console.error('Failed to load ops data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time vehicle location updates
  const handleVehicleLocation = useCallback((data) => {
    setVehicles((prev) => {
      const idx = prev.findIndex((v) => v.id === data.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...data };
        return updated;
      }
      return [...prev, data];
    });
  }, []);

  useSocketEvent('vehicle:location', handleVehicleLocation);

  // Real-time activity feed
  const handleNewActivity = useCallback((entry) => {
    setActivity((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  useSocketEvent('activity:new', handleNewActivity);

  const activeVehicles = vehicles.filter((v) => v.status === 'active');
  const vehicleList = vehicles.slice(0, 10);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Live Ops Center" />

      <div className="flex-1 flex overflow-hidden">
        {/* Map Panel */}
        <div className="w-[70%] relative">
          <MapContainer
            center={DOHA_CENTER}
            zoom={12}
            className="h-full w-full"
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {vehicles.map(
              (vehicle) =>
                vehicle.latitude &&
                vehicle.longitude && (
                  <Marker
                    key={vehicle.id}
                    position={[vehicle.latitude, vehicle.longitude]}
                    icon={vehicleIcon}
                  >
                    <Popup>
                      <div className="text-sm space-y-1">
                        <p className="font-semibold">{vehicle.name}</p>
                        <p className="text-gray-600">
                          Plate: {vehicle.plate_number || '-'}
                        </p>
                        <p className="text-gray-600">
                          Driver: {vehicle.driver_name || 'Unassigned'}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )
            )}
            {robots.map(
              (robot) =>
                robot.latitude &&
                robot.longitude && (
                  <Marker
                    key={`robot-${robot.id}`}
                    position={[robot.latitude, robot.longitude]}
                    icon={robotIcon}
                  >
                    <Popup>
                      <div className="text-sm space-y-1">
                        <p className="font-semibold">{robot.name}</p>
                        <p className="text-gray-600">S/N: {robot.serial_number || '-'}</p>
                        <p className="text-gray-600">Status: {robot.status || '-'}</p>
                        <p className="text-gray-600">Battery: {robot.battery_level != null ? `${robot.battery_level}%` : '-'}</p>
                      </div>
                    </Popup>
                  </Marker>
                )
            )}
          </MapContainer>
        </div>

        {/* Right Sidebar */}
        <div className="w-[30%] border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          {/* Fleet Status Cards */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Fleet Status
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <Truck size={20} className="mx-auto text-blue-600 mb-1" />
                <p className="text-lg font-bold text-gray-900">
                  {activeVehicles.length}/{vehicles.length}
                </p>
                <p className="text-xs text-gray-500">Vehicles Active</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <Bot size={20} className="mx-auto text-purple-600 mb-1" />
                <p className="text-lg font-bold text-gray-900">
                  {fleetStats?.robotsInUse || 0}/{fleetStats?.totalRobots || 0}
                </p>
                <p className="text-xs text-gray-500">Robots Working</p>
              </div>
            </div>
          </div>

          {/* Vehicle List */}
          <div className="flex-1 overflow-y-auto p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
              Vehicles
            </h3>
            <div className="space-y-2">
              {vehicleList.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {v.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {v.plate_number || '-'}
                    </p>
                  </div>
                  <AlertBadge status={v.status} />
                </div>
              ))}
              {vehicleList.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No vehicles found
                </p>
              )}
            </div>
          </div>

          {/* Robot List */}
          <div className="flex-1 overflow-y-auto p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Robots</h3>
            <div className="space-y-2">
              {robots.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.serial_number || '-'}{r.battery_level != null ? ` | ${r.battery_level}%` : ''}</p>
                  </div>
                  <AlertBadge status={r.status} />
                </div>
              ))}
              {robots.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No robots found</p>
              )}
            </div>
          </div>

          {/* Operations Feed */}
          <div className="h-64 flex-shrink-0 overflow-y-auto p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={14} className="text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Operations Feed
              </h3>
            </div>
            <div className="space-y-2">
              {activity.map((entry, i) => (
                <div
                  key={entry.id || i}
                  className="border-l-2 border-gray-200 pl-3 py-1"
                >
                  <p className="text-sm text-gray-800">{entry.action}</p>
                  <p className="text-xs text-gray-500">{entry.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {timeAgo(entry.created_at || entry.timestamp)}
                  </p>
                </div>
              ))}
              {activity.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

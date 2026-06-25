import React, { useState, useEffect } from 'react';
import { useDockerStore } from '../../stores/dockerStore';

export function DockerManager() {
  const [projectName, setProjectName] = useState('claw-master');
  const [enableServer, setEnableServer] = useState(true);
  const [enablePostgres, setEnablePostgres] = useState(true);
  const [enableRedis, setEnableRedis] = useState(false);
  const [enableQdrant, setEnableQdrant] = useState(false);
  const [enableMinio, setEnableMinio] = useState(false);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState('');

  const {
    status,
    services,
    isLoading,
    output,
    checkDocker,
    generateConfig,
    startServices,
    stopServices,
    fetchServicesStatus,
    pullImages,
    getLogs,
  } = useDockerStore();

  useEffect(() => {
    checkDocker();
    fetchServicesStatus();
  }, []);

  const handleGenerate = async () => {
    await generateConfig({
      projectName,
      enableServer,
      enablePostgres,
      enableRedis,
      enableQdrant,
      enableMinio,
    });
  };

  const handleViewLogs = async (serviceName: string) => {
    setShowLogs(serviceName);
    const logs = await getLogs(serviceName);
    setLogs(logs);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Docker 部署</h2>
        <div className="flex items-center gap-2">
          {status?.installed ? (
            <span className="px-2 py-1 text-xs bg-green-600 text-white rounded">
              Docker {status.version}
            </span>
          ) : (
            <span className="px-2 py-1 text-xs bg-red-600 text-white rounded">Not Installed</span>
          )}
          {status?.running ? (
            <span className="px-2 py-1 text-xs bg-green-600 text-white rounded">Running</span>
          ) : (
            <span className="px-2 py-1 text-xs bg-yellow-600 text-white rounded">Stopped</span>
          )}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg space-y-4">
        <h3 className="text-white font-medium">配置生成</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">项目名称</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-400">启用服务</label>
          <div className="flex flex-wrap gap-4">
            {[
              { label: 'Server', value: enableServer, setter: setEnableServer },
              { label: 'PostgreSQL', value: enablePostgres, setter: setEnablePostgres },
              { label: 'Redis', value: enableRedis, setter: setEnableRedis },
              { label: 'Qdrant', value: enableQdrant, setter: setEnableQdrant },
              { label: 'MinIO', value: enableMinio, setter: setEnableMinio },
            ].map((item) => (
              <label key={item.label} className="flex items-center gap-2 text-white">
                <input
                  type="checkbox"
                  checked={item.value}
                  onChange={(e) => item.setter(e.target.checked)}
                  className="rounded"
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isLoading || !status?.installed}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            生成配置
          </button>
          <button
            onClick={pullImages}
            disabled={isLoading || !status?.installed}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            拉取镜像
          </button>
          <button
            onClick={startServices}
            disabled={isLoading || !status?.installed}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            启动服务
          </button>
          <button
            onClick={stopServices}
            disabled={isLoading || !status?.installed}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            停止服务
          </button>
        </div>
      </div>

      {services.length > 0 && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-white font-medium mb-4">服务状态</h3>
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{service.name}</span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded ${
                      service.state === 'running'
                        ? 'bg-green-600 text-white'
                        : service.state === 'exited'
                        ? 'bg-red-600 text-white'
                        : 'bg-yellow-600 text-white'
                    }`}
                  >
                    {service.state}
                  </span>
                  <span className="text-gray-400 text-sm">{service.status}</span>
                </div>
                <button
                  onClick={() => handleViewLogs(service.name)}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-500"
                >
                  Logs
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {output && (
        <div className="bg-gray-900 p-4 rounded-lg">
          <h3 className="text-white font-medium mb-2">Output</h3>
          <pre className="text-gray-300 text-sm overflow-x-auto whitespace-pre-wrap">{output}</pre>
        </div>
      )}

      {showLogs && (
        <div className="bg-gray-900 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-medium">Logs: {showLogs}</h3>
            <button
              onClick={() => setShowLogs(null)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          <pre className="text-gray-300 text-sm overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
            {logs}
          </pre>
        </div>
      )}
    </div>
  );
}
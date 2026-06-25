/**
 * Renderer-side mirror of Docker service types.
 * Mirrors src/main/features/docker/docker.service.ts.
 */

export interface DockerStatus {
  installed: boolean
  running: boolean
  version?: string
}

export interface DockerComposeConfig {
  version: string
  services: Record<string, DockerServiceConfig>
  volumes?: Record<string, unknown>
  networks?: Record<string, unknown>
}

export interface DockerServiceConfig {
  image: string
  ports?: string[]
  volumes?: string[]
  environment?: Record<string, string>
  depends_on?: string[]
  restart?: string
}

export interface ContainerInfo {
  id: string
  name: string
  image: string
  status: string
  state: 'running' | 'stopped' | 'exited' | 'created'
  ports: string
  created: string
}

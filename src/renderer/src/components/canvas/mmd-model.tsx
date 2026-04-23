import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { MMDLoader, VMDLoader, buildAnimation } from '@moeru/three-mmd'
import { useForceIgnoreMouse } from '@/hooks/utils/use-force-ignore-mouse'

interface MMDModelProps {
    pmxUrl: string
    vmdUrl?: string
    isPet?: boolean
    petOffsetY?: number
}

export function MMDModel({ pmxUrl, vmdUrl, isPet, petOffsetY = 0 }: MMDModelProps) {
    const mountRef = useRef<HTMLDivElement>(null)
    const { forceIgnoreMouse } = useForceIgnoreMouse()

    useEffect(() => {
        const mount = mountRef.current
        if (!mount) return

        const width = mount.clientWidth || window.innerWidth
        const height = mount.clientHeight || window.innerHeight

        console.log('[MMDModel] mount size:', width, height)

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setSize(width, height)
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.domElement.style.pointerEvents = 'none'
        mount.appendChild(renderer.domElement)

        // Drag state
        const meshRef = { current: null as THREE.SkinnedMesh | null }
        let isDragging = false
        let dragStartX = 0
        let dragStartY = 0
        let meshStartX = 0
        let meshStartZ = 0

        const onMouseDown = (e: MouseEvent) => {
            isDragging = true
            dragStartX = e.clientX
            dragStartY = e.clientY
            if (meshRef.current) {
                meshStartX = meshRef.current.position.x
                meshStartZ = meshRef.current.position.z
            }
        }

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging || !meshRef.current) return
            const dx = (e.clientX - dragStartX) * 0.05
            const dy = (e.clientY - dragStartY) * 0.05
            meshRef.current.position.x = meshStartX + dx
            meshRef.current.position.z = meshStartZ + dy
        }
        const electronApi = (window as any).electron
        const onMouseUp = () => { isDragging = false }

        const onMouseEnter = () => {
            electronApi?.ipcRenderer.send('update-component-hover', 'mmd-model', true)
        }

        const onMouseLeave = () => {
            electronApi?.ipcRenderer.send('update-component-hover', 'mmd-model', false)
        }


        if (isPet) {
            mount.addEventListener('mousedown', onMouseDown)
            mount.addEventListener('mousemove', onMouseMove)
            mount.addEventListener('mouseup', onMouseUp)
            mount.addEventListener('mouseenter', onMouseEnter)
            mount.addEventListener('mouseleave', onMouseLeave)
        }

        const scene = new THREE.Scene()

        const aspect = width / height
        const zDistance = isPet ? 150 : 40
        const cameraY = isPet ? 10.27 + (petOffsetY * 0.01) : 10.27
        // const adjustedZ = zDistance / aspect * 1.5

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
        camera.position.set(0, cameraY, zDistance)
        camera.lookAt(0, cameraY, 0)

        scene.add(new THREE.AmbientLight(0xffffff, 1.5))
        const dirLight = new THREE.DirectionalLight(0xffffff, 1)
        dirLight.position.set(5, 10, 5)
        scene.add(dirLight)

        // Mesh de prueba para verificar que Three.js funciona
        const testMesh = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            new THREE.MeshStandardMaterial({ color: 0xff0000 }),
        )
        scene.add(testMesh)

        const mixerRef = { current: null as THREE.AnimationMixer | null }
        const clockRef = { current: new THREE.Clock() }

        const loader = new MMDLoader()
        loader.load(
            pmxUrl,
            (mmd) => {
                console.log('[MMDModel] Model loaded successfully!')
                scene.remove(testMesh)
                mmd.mesh.scale.setScalar(1)
                mmd.mesh.position.set(0, 0, 0)
                scene.add(mmd.mesh)
                meshRef.current = mmd.mesh

                // Cargar animación VMD si existe
                if (vmdUrl) {
                    const vmdLoader = new VMDLoader()
                    vmdLoader.load(
                        vmdUrl,
                        (vmd) => {
                            const animation = buildAnimation(vmd, mmd.mesh)
                            animation.name = 'motion'
                            const mixer = new THREE.AnimationMixer(mmd.mesh)
                            mixer.clipAction(animation).play()
                            mixerRef.current = mixer
                        },
                        undefined,
                        (error) => console.error('[MMDModel] VMD error:', error),
                    )
                }
            },
            (progress) => {
                console.log('[MMDModel] Loading:', Math.round(100 * progress.loaded / progress.total) + '%')
            },
            (error) => console.error('[MMDModel] Error:', error),
        )

        const handleResize = () => {
            const w = mount.clientWidth || window.innerWidth
            const h = mount.clientHeight || window.innerHeight
            camera.aspect = w / h
            camera.updateProjectionMatrix()
            renderer.setSize(w, h)
        }
        window.addEventListener('resize', handleResize)

        let animId: number
        const animate = () => {
            animId = requestAnimationFrame(animate)
            const delta = clockRef.current.getDelta()
            if (mixerRef.current) {
                mixerRef.current.update(delta)
            }
            testMesh.rotation.y += 0.01
            renderer.render(scene, camera)
        }
        animate()

        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener('resize', handleResize)
            if (isPet) {
                mount.removeEventListener('mousedown', onMouseDown)
                mount.removeEventListener('mousemove', onMouseMove)
                mount.removeEventListener('mouseup', onMouseUp)
                mount.removeEventListener('mouseenter', onMouseEnter)
                mount.removeEventListener('mouseleave', onMouseLeave)
            }
            mount.removeChild(renderer.domElement)
            renderer.dispose()
        }
    }, [pmxUrl, isPet])

    return (
        <div
            ref={mountRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 6,
                pointerEvents: 'none',
            }}
        />
    )
}
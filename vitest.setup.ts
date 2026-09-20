// vitest.setup.ts
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock Next.js navigation (useRouter, usePathname, etc.)
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      prefetch: () => null,
      push: () => null,
      replace: () => null,
      back: () => null,
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

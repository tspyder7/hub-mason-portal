import { vi } from 'vitest';

const mockLogger = {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
};

vi.mock('hub-mason-core/utils/logger', () => ({
    logger: mockLogger,
}));

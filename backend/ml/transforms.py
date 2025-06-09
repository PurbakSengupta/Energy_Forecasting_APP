import numpy as np
from scipy.fftpack import dct
import pywt

def apply_dct(data: np.ndarray) -> np.ndarray:
    if data.ndim == 1:
        data = data.reshape(1, -1)  # (1, N)
    return dct(data, norm='ortho', axis=1)

def apply_dwt(data: np.ndarray) -> np.ndarray:
    if data.ndim == 1:
        data = data.reshape(1, -1)
    coeffs = [pywt.dwt(row, 'haar')[0] for row in data]
    padded = [np.pad(c, (0, data.shape[1] - len(c))) for c in coeffs]
    return np.array(padded)

def apply_cs(data: np.ndarray) -> np.ndarray:
    if data.ndim == 1:
        data = data.reshape(1, -1)
    compressed = [row[::2] for row in data]  # keep every 2nd sample
    padded = [np.pad(row, (0, data.shape[1] - len(row))) for row in compressed]
    return np.array(padded)

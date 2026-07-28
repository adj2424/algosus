import { createTheme } from '@mui/material/styles';

// Deliberate palette: deep ink neutrals + a single teal accent, distinct
// positive/negative colors for equity moves. Avoids generic purple-gradient
// and cream/terracotta AI-default looks (see R10).
export const palette = {
  ink: '#12181f',
  inkMuted: '#4b5563',
  paper: '#ffffff',
  surface: '#f6f7f9',
  border: '#e2e5ea',
  accent: '#0f766e',
  accentMuted: '#e6f4f2',
  positive: '#0f9d58',
  negative: '#d33f3f'
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: palette.accent },
    success: { main: palette.positive },
    error: { main: palette.negative },
    background: { default: palette.surface, paper: palette.paper },
    text: { primary: palette.ink, secondary: palette.inkMuted },
    divider: palette.border
  },
  typography: {
    fontFamily: '"Sora", "Inter", system-ui, sans-serif',
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    body1: { fontFamily: '"Inter", system-ui, sans-serif' },
    body2: { fontFamily: '"Inter", system-ui, sans-serif' }
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderColor: palette.border,
          boxShadow: 'none'
        }
      }
    },
    MuiButtonGroup: {
      styleOverrides: {
        root: {
          borderRadius: 999
        }
      }
    }
  }
});

export default theme;

'use client';

import { cloneElement, CSSProperties, ReactElement } from 'react';

// next
import Link from 'next/link';

// material-ui
import { alpha } from '@mui/material/styles';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Links from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';

// project-imports
import AnimateButton from 'components/@extended/AnimateButton';
import Logo from 'components/logo';

interface ElevationScrollProps {
  children: ReactElement<{ style?: CSSProperties }>;
  window?: () => Window;
}

function ElevationScroll({ children, window }: ElevationScrollProps) {
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 10,
    target: window ? window() : undefined
  });

  return cloneElement(children, {
    style: {
      boxShadow: trigger ? '0 8px 24px rgba(15, 23, 42, 0.08)' : 'none'
    }
  });
}

interface Props {
  layout?: string;
}

// ==============================|| ANALYZER - APP BAR ||============================== //

export default function Header({ layout = 'landing', ...others }: Props) {
  return (
    <ElevationScroll {...others}>
      <AppBar
        sx={(theme) => ({
          bgcolor: triggerBackground(layout, theme.palette.background.default),
          backdropFilter: 'blur(14px)',
          color: 'text.primary',
          boxShadow: 'none'
        })}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ px: { xs: 0, sm: 2, md: 0 }, py: 1.25, gap: 2 }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexGrow: 1 }}>
              <Logo to="/" />
              <Chip label="Analyzer" variant="light" color="primary" size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' } }} />
            </Stack>

            <Stack
              direction="row"
              spacing={{ xs: 1, md: 3 }}
              sx={{
                alignItems: 'center',
                '& .header-link': { display: { xs: 'none', md: 'inline-flex' }, fontWeight: 500, '&:hover': { color: 'primary.main' } }
              }}
            >
              <Links className="header-link" color="secondary.main" href="#issues" underline="none">
                Issues
              </Links>
              <Links className="header-link" color="secondary.main" href="#metrics" underline="none">
                Metrics
              </Links>
              <AnimateButton>
                <Button component={Link} href="/" disableElevation color="primary" size="large" variant="contained">
                  Analyze a site
                </Button>
              </AnimateButton>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>
    </ElevationScroll>
  );
}

const triggerBackground = (layout: string, defaultBackground: string) =>
  layout === 'landing' ? alpha(defaultBackground, 0.78) : alpha(defaultBackground, 0.92);

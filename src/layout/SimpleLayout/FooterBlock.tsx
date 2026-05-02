// material-ui
import { alpha } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project-imports
import Logo from 'components/logo';

type FooterBlockProps = {
  isFull?: boolean;
};

// ==============================|| ANALYZER - FOOTER ||============================== //

export default function FooterBlock({ isFull }: FooterBlockProps) {
  return (
    <>
      <Box
        sx={(theme) => ({
          pt: isFull ? 6 : 10,
          pb: 8,
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          borderTop: `1px solid ${theme.palette.divider}`
        })}
      >
        <Container>
          <Grid container spacing={4} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Stack spacing={2}>
                <Logo to="/" />
                <Typography variant="h3" sx={{ maxWidth: 620 }}>
                  Turn performance data into a prioritized fix plan.
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 620 }}>
                  Website Analyzer combines runtime scanning, Lighthouse metrics, deterministic signals, and AI recommendations so teams can
                  focus on the changes that matter most.
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: { md: 'flex-end' } }}>
                <Button href="/" variant="contained" size="large">
                  Start an analysis
                </Button>
                <Button href="#metrics" variant="outlined" color="secondary" size="large">
                  View metrics
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <Box sx={{ py: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Container>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography color="text.secondary">© {new Date().getFullYear()} Website Analyzer. Built for faster websites.</Typography>
            <Stack direction="row" spacing={2}>
              <Link href="#issues" underline="hover" color="text.secondary">
                Issues
              </Link>
              <Link href="#metrics" underline="hover" color="text.secondary">
                Metrics
              </Link>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </>
  );
}

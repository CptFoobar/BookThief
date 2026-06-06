import { NavLink } from '@mantine/core';
import { Link } from 'react-router-dom';

export const SidebarLink = ({ to, label, icon: Icon, active, onClick }) => (
  <NavLink
    component={Link}
    to={to}
    label={label}
    leftSection={<Icon size={24} />}
    active={active}
    onClick={onClick}
    color="black"
    styles={(theme) => ({
      root: {
        backgroundColor: theme.colors.beige[2],
        borderRadius: theme.radius.sm,
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: theme.black,
          color: theme.white,
          transform: 'translateX(4px)',
        },
        '&[dataActive]': {
          backgroundColor: theme.black,
          color: theme.white,
        },
      },
      label: { fontWeight: 600, fontSize: 'var(--mantine-font-size-xl)' },
    })}
  />
);

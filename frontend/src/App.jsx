import { useState } from 'react';
import {
  AppShell,
  Burger,
  Group,
  Stack,
  Title,
} from '@mantine/core';
import { useMediaQuery, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconCheck,
  IconX,
  IconHistory,
} from '@tabler/icons-react';
import { Routes, Route, useLocation } from 'react-router-dom';
import axios from 'axios';

import { SearchPage } from './pages/SearchPage';
import { HistoryPage } from './pages/HistoryPage';
import { SidebarLink } from './components/SidebarLink';

const API_BASE = 'http://localhost:8000';

function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [downloading, setDownloading] = useState({});
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setHasSearched(true);
    setVisibleCount(20);
    try {
      const response = await axios.get(`${API_BASE}/search`, {
        params: { query },
      });
      setBooks(response.data);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch results',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (book, sendToKindle = false) => {
    const notificationId = `dl-${book.id}-${Date.now()}`;
    
    notifications.show({
      id: notificationId,
      title: 'Downloading',
      message: book.title,
      loading: true,
      autoClose: false,
      withCloseButton: false,
      color: 'black',
      styles: (theme) => ({
        root: { backgroundColor: theme.colors.beige[4] },
        title: { fontWeight: 700 },
      }),
    });

    setDownloading((prev) => ({ ...prev, [book.id]: true }));

    try {
      await axios.post(`${API_BASE}/download`, {
        ...book,
        send_to_kindle: sendToKindle,
      });

      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await axios.get(`${API_BASE}/status/${book.id}`);
          const status = statusRes.data.status;
          
          if (status === 'kindle-sent') {
            clearInterval(interval);
            setDownloading((prev) => ({ ...prev, [book.id]: false }));
            notifications.update({
              id: notificationId,
              title: 'Success',
              message: 'Book sent to your Kindle!',
              color: 'green',
              icon: <IconCheck size={18} />,
              loading: false,
              autoClose: 5000,
              withCloseButton: true,
              styles: (theme) => ({
                root: { backgroundColor: theme.colors.beige[4] },
              }),
            });
          } else if (status === 'kindle-sending') {
            notifications.update({
              id: notificationId,
              title: 'Sending to Kindle',
              message: book.title,
              loading: true,
              styles: (theme) => ({
                root: { backgroundColor: theme.colors.beige[4] },
              }),
            });
          } else if (status === 'kindle-failed') {
            clearInterval(interval);
            setDownloading((prev) => ({ ...prev, [book.id]: false }));
            notifications.update({
              id: notificationId,
              title: 'Kindle Sync Failed',
              message: `Failed to send ${book.title} to Kindle`,
              color: 'red',
              icon: <IconX size={18} />,
              loading: false,
              autoClose: 5000,
              withCloseButton: true,
              styles: (theme) => ({
                root: { backgroundColor: theme.colors.beige[4] },
              }),
            });
          } else if (status === 'downloaded') {
            if (sendToKindle) {
              notifications.update({
                id: notificationId,
                title: 'Sending to Kindle',
                message: book.title,
                loading: true,
                styles: (theme) => ({
                  root: { backgroundColor: theme.colors.beige[4] },
                }),
              });
            } else {
              clearInterval(interval);
              setDownloading((prev) => ({ ...prev, [book.id]: false }));
              notifications.update({
                id: notificationId,
                title: 'Success',
                message: `Download complete! Saved locally.`,
                color: 'green',
                icon: <IconCheck size={18} />,
                loading: false,
                autoClose: 5000,
                withCloseButton: true,
                styles: (theme) => ({
                  root: { backgroundColor: theme.colors.beige[4] },
                }),
              });
            }
          } else if (status === 'download-failed') {
            clearInterval(interval);
            setDownloading((prev) => ({ ...prev, [book.id]: false }));
            notifications.update({
              id: notificationId,
              title: 'Download Failed',
              message: `Failed to download ${book.title}`,
              color: 'red',
              icon: <IconX size={18} />,
              loading: false,
              autoClose: 5000,
              withCloseButton: true,
              styles: (theme) => ({
                root: { backgroundColor: theme.colors.beige[4] },
              }),
            });
          }
        } catch (err) {
          if (attempts > 60) {
            clearInterval(interval);
            setDownloading((prev) => ({ ...prev, [book.id]: false }));
            notifications.update({
              id: notificationId,
              title: 'Timeout',
              message: 'Lost connection to download status.',
              color: 'yellow',
              loading: false,
              autoClose: 5000,
              withCloseButton: true,
            });
          }
        }
      }, 2000);
    } catch (error) {
      setDownloading((prev) => ({ ...prev, [book.id]: false }));
      notifications.update({
        id: notificationId,
        title: 'Error',
        message: 'Could not start process. Is the backend running?',
        color: 'red',
        icon: <IconX size={18} />,
        loading: false,
        autoClose: 5000,
        withCloseButton: true,
      });
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      padding="md"
      styles={(theme) => ({
        main: {
          backgroundColor: theme.colors.beige[1],
          minHeight: '100vh',
        },
        header: {
          backgroundColor: theme.colors.beige[1],
          borderBottom: '1px solid rgba(0,0,0,0.1)',
        },
        navbar: {
          backgroundColor: theme.colors.beige[1],
          borderRight: '1px solid rgba(0,0,0,0.1)',
        },
      })}
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} size="sm" color="black" />
          <Title order={3} style={{ color: 'black', fontWeight: 900 }}>
            Book<span style={{ color: '#F5F5DC', WebkitTextStroke: '1px black' }}>Thief</span>
          </Title>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="xs">
          <SidebarLink
            to="/"
            label="Search"
            icon={IconSearch}
            active={location.pathname === '/'}
            onClick={close}
          />
          <SidebarLink
            to="/history"
            label="History"
            icon={IconHistory}
            active={location.pathname === '/history'}
            onClick={close}
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route
            path="/"
            element={
              <SearchPage
                query={query}
                setQuery={setQuery}
                loading={loading}
                books={books}
                hasSearched={hasSearched}
                visibleCount={visibleCount}
                setVisibleCount={setVisibleCount}
                downloading={downloading}
                handleSearch={handleSearch}
                handleDownload={handleDownload}
                isMobile={isMobile}
              />
            }
          />
          <Route path="/history" element={<HistoryPage isMobile={isMobile} />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;

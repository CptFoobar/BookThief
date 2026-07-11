import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Table,
  Group,
  Title,
  Text,
  Stack,
  Badge,
  Loader,
  Center,
  Image,
  Card,
  Pagination,
  ActionIcon,
  Tooltip,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { IconCheck, IconBook, IconSearch, IconTrash } from '@tabler/icons-react';
import axios from 'axios';
import { DateTime } from 'luxon';
import lootImg from '../assets/book-thief-loot.jpeg';

const API_BASE = `http://${window.location.hostname}:8000`;

export function HistoryPage({ isMobile }) {
  const [history, setHistory] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ sent_to_kindle: 0, downloading: 0, read: 0 });
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [togglingIds, setTogglingIds] = useState(new Set());
  const [deletingIds, setDeletingIds] = useState(new Set());
  const itemsPerPage = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setActivePage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const fetchHistory = useCallback(async (active = true) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/downloads`, {
        params: { page: activePage, limit: itemsPerPage, search: debouncedSearch }
      });
      
      if (!active) return;

      const data = response.data;
      if (Array.isArray(data)) {
        // Fallback for old API format
        setHistory(data);
        setTotalItems(data.length);
      } else {
        setHistory(data.items || []);
        setTotalItems(data.total || 0);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch {
      if (!active) return;
      notifications.show({
        title: 'Error',
        message: 'Failed to fetch history',
        color: 'red',
      });
    } finally {
      if (active) setLoading(false);
    }
  }, [activePage, debouncedSearch]);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory(active);
    return () => { active = false; };
  }, [fetchHistory]);

  const toggleFinished = async (id, currentStatus) => {
    if (togglingIds.has(id)) return;
    
    setTogglingIds(prev => new Set(prev).add(id));
    try {
      const newStatus = !currentStatus;
      await axios.post(`${API_BASE}/finished/${id}`, { finished: newStatus });
      setHistory(prev => prev.map(item => item.id === id ? { ...item, finished: newStatus } : item));
      notifications.show({
        title: 'Success',
        message: newStatus ? 'Marked as read' : 'Marked as unread',
        color: 'teal',
      });
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to update status',
        color: 'red',
      });
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const deleteEntry = async (id) => {
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      await axios.delete(`${API_BASE}/downloads/${id}`);
      notifications.show({
        title: 'Success',
        message: 'Entry removed from history',
        color: 'teal',
      });
      fetchHistory();
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete entry',
        color: 'red',
      });
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const openDeleteModal = (id) => modals.openConfirmModal({
    title: 'Delete history entry',
    centered: true,
    children: (
      <Text size="sm">
        Are you sure you want to delete this entry from history? This action cannot be undone.
      </Text>
    ),
    labels: { confirm: 'Delete', cancel: 'Cancel' },
    confirmProps: { color: 'red' },
    onConfirm: () => deleteEntry(id),
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'downloading':
      case 'kindle-sending':
        return 'blue';
      case 'downloaded':
        return 'teal';
      case 'kindle-sent':
        return 'green';
      case 'download-failed':
      case 'kindle-failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const dt = DateTime.fromSQL(ts, { zone: 'utc' }).toLocal();
    if (!dt.isValid) {
      const dtIso = DateTime.fromISO(ts);
      return dtIso.isValid ? dtIso.toFormat('LLL dd, yyyy HH:mm') : 'Unknown Date';
    }
    return dt.toFormat('LLL dd, yyyy HH:mm');
  };

  const HistoryCard = ({ item }) => (
    <Card 
      withBorder 
      shadow="sm" 
      radius="md" 
      padding="md" 
      style={{ 
        backgroundColor: item.finished ? 'rgba(64, 192, 87, 0.1)' : undefined,
        opacity: item.finished ? 0.8 : 1 
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Text fw={700} size="lg" lineClamp={2}>
            {item.title}
          </Text>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon 
              variant={item.finished ? "filled" : "outline"} 
              color={item.finished ? "teal" : "gray"}
              onClick={() => toggleFinished(item.id, item.finished)}
              size="lg"
              radius="xl"
              loading={togglingIds.has(item.id)}
            >
              {item.finished ? <IconCheck size={20} /> : <IconBook size={20} />}
            </ActionIcon>
            <ActionIcon 
              variant="light" 
              color="red"
              onClick={() => openDeleteModal(item.id)}
              size="lg"
              radius="xl"
              loading={deletingIds.has(item.id)}
            >
              <IconTrash size={20} />
            </ActionIcon>
          </Group>
        </Group>
        <Text size="sm" c="dimmed">
          {item.authors}
        </Text>
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {formatTimestamp(item.timestamp)}
          </Text>
          <Badge color={getStatusColor(item.status)} variant="filled">
            {item.status.replace(/-/g, ' ')}
          </Badge>
        </Group>
      </Stack>
    </Card>
  );

  return (
    <Container size="lg" py="xl">
      <Stack align="center" gap="xl">
        <Image 
          src={lootImg} 
          className="torn-paper" 
          alt="Book Thief Loot"
          fallbackSrc="https://placehold.co/300x150?text=History+Loot"
        />
        <Title order={1} style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', fontWeight: 900, color: '#000', marginTop: -20 }} pt="lg">
          History
        </Title>
        
        <Group grow style={{ width: '100%', maxWidth: 500 }} gap="md">
          <Card withBorder padding="xs" radius="md" >
            <Stack gap={0} align="center">
              <Text size="xs" c="dimmed" fw={500} tt="uppercase">Kindle</Text>
              <Text size="xl" fw={900}>{stats.sent_to_kindle}</Text>
            </Stack>
          </Card>
          <Card withBorder padding="xs" radius="md" >
            <Stack gap={0} align="center">
              <Text size="xs" c="dimmed" fw={500} tt="uppercase">Read</Text>
              <Text size="xl" fw={900}>{stats.read}</Text>
            </Stack>
          </Card>
          <Card withBorder padding="xs" radius="md" >
            <Stack gap={0} align="center">
              <Text size="xs" c="dimmed" fw={500} tt="uppercase">Downloading</Text>
              <Text size="xl" fw={900}>{stats.downloading}</Text>
            </Stack>
          </Card>
        </Group>

        <TextInput
          placeholder="Search history by title or author..."
          size="md"
          style={{ width: '100%', maxWidth: 600 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftSection={<IconSearch size={18} />}
          clearable
        />
      </Stack>

      {loading ? (
        <Center mt="xl">
          <Loader color="beige" />
        </Center>
      ) : (!history || history.length === 0) ? (
        <Center mt="xl">
          <Text fw={700} size="xl" c="black">
            {debouncedSearch ? `No results found for "${debouncedSearch}"` : "No history yet"}
          </Text>
        </Center>
      ) : (
        <Stack mt="xl" gap="md">
          {isMobile ? (
            <Stack gap="md">
              {history.map((item) => (
                <HistoryCard key={item.id} item={item} />
              ))}
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={800}>
              <Table highlightOnHover withTableBorder verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Title</Table.Th>
                    <Table.Th>Author</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {history.map((item) => (
                    <Table.Tr 
                      key={item.id} 
                      style={{ 
                        backgroundColor: item.finished ? 'rgba(64, 192, 87, 0.1)' : undefined,
                        opacity: item.finished ? 0.8 : 1 
                      }}
                    >
                      <Table.Td>
                        <Text fw={500} size="sm" lineClamp={2}>
                          {item.title}
                        </Text>
                      </Table.Td>
                      <Table.Td size="sm">{item.authors}</Table.Td>
                      <Table.Td size="sm">
                        {formatTimestamp(item.timestamp)}
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(item.status)} variant="filled">
                          {item.status.replace(/-/g, ' ')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label={item.finished ? "Mark as unread" : "Mark as read"}>
                            <ActionIcon 
                              variant={item.finished ? "filled" : "light"} 
                              color={item.finished ? "teal" : "gray"}
                              onClick={() => toggleFinished(item.id, item.finished)}
                              radius="xl"
                              loading={togglingIds.has(item.id)}
                            >
                              {item.finished ? <IconCheck size={16} /> : <IconBook size={16} />}
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete from history">
                            <ActionIcon 
                              variant="light" 
                              color="red"
                              onClick={() => openDeleteModal(item.id)}
                              radius="xl"
                              loading={deletingIds.has(item.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}

          {totalPages > 1 && (
            <Center mt="xl">
              <Pagination 
                total={totalPages} 
                value={activePage} 
                onChange={setActivePage} 
                color="black"
                boundaries={1}
              />

            </Center>
          )}
        </Stack>
      )}
    </Container>
  );
}

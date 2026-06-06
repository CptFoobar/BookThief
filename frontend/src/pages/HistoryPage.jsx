import { useState, useEffect } from 'react';
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
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import { DateTime } from 'luxon';
import lootImg from '../assets/book-thief-loot.jpeg';

const API_BASE = `http://${window.location.hostname}:8000`;

export function HistoryPage({ isMobile }) {
  const [history, setHistory] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ sent_to_kindle: 0, downloading: 0 });
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_BASE}/downloads`, {
          params: { page: activePage, limit: itemsPerPage }
        });
        
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
      } catch (error) {
        notifications.show({
          title: 'Error',
          message: 'Failed to fetch history',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [activePage]);

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
    <Card withBorder shadow="sm" radius="md" padding="md">
      <Stack gap="xs">
        <Text fw={700} size="lg" lineClamp={2}>
          {item.title}
        </Text>
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
        
        <Group grow style={{ width: '100%', maxWidth: 400 }} gap="md">
          <Card withBorder padding="xs" radius="md" >
            <Stack gap={0} align="center">
              <Text size="xs" c="dimmed" fw={500} tt="uppercase">Sent to Kindle</Text>
              <Text size="xl" fw={900}>{stats.sent_to_kindle}</Text>
            </Stack>
          </Card>
          <Card withBorder padding="xs" radius="md" >
            <Stack gap={0} align="center">
              <Text size="xs" c="dimmed" fw={500} tt="uppercase">Downloading</Text>
              <Text size="xl" fw={900}>{stats.downloading}</Text>
            </Stack>
          </Card>
        </Group>
      </Stack>

      {loading ? (
        <Center mt="xl">
          <Loader color="beige" />
        </Center>
      ) : (!history || history.length === 0) ? (
        <Center mt="xl">
          <Text fw={700} size="xl" c="black">No history yet</Text>
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
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {history.map((item) => (
                    <Table.Tr key={item.id}>
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

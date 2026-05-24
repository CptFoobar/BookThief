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
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import { DateTime } from 'luxon';
import lootImg from '../assets/book-thief-loot.jpeg';

const API_BASE = `http://${window.location.hostname}:8000`;

export function HistoryPage({ isMobile }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API_BASE}/downloads`);
        setHistory(response.data);
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
  }, []);

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
      </Stack>

      {loading ? (
        <Center mt="xl">
          <Loader color="beige" />
        </Center>
      ) : history.length === 0 ? (
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
        </Stack>
      )}
    </Container>
  );
}

import { useState, useEffect } from 'react';
import {
  Container,
  TextInput,
  Button,
  Table,
  Group,
  Title,
  Text,
  Stack,
  ActionIcon,
  Badge,
  Loader,
  Center,
  Image,
  Card,
  Divider,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconSearch,
  IconCheck,
  IconX,
  IconExternalLink,
  IconSend,
} from '@tabler/icons-react';
import axios from 'axios';
import bannerImg from './assets/book-thief-banner.jpeg';
import noResultsImg from './assets/book-thief-no-results.jpeg';

const API_BASE = 'http://localhost:8000';

function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [downloading, setDownloading] = useState({});
  const isMobile = useMediaQuery('(max-width: 768px)');

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
    const notificationId = sendToKindle ? `kindle-${book.id}` : book.id;
    const title = sendToKindle ? 'Kindle Sync' : 'Downloading';
    const message = sendToKindle ? `Starting Kindle sync for ${book.title}` : `Started downloading ${book.title}`;

    notifications.show({
      id: notificationId,
      title,
      message,
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });

    setDownloading((prev) => ({ ...prev, [book.id]: true }));

    try {
      await axios.post(`${API_BASE}/download`, {
        ...book,
        send_to_kindle: sendToKindle,
      });

      // Poll for status
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await axios.get(`${API_BASE}/status/${book.id}`);
          if (statusRes.data.status === 'downloaded') {
            clearInterval(interval);
            setDownloading((prev) => ({ ...prev, [book.id]: false }));
            
            notifications.update({
              id: notificationId,
              title: sendToKindle ? 'Sent to Kindle' : 'Success',
              message: sendToKindle 
                ? `Book downloaded and queued for Kindle delivery` 
                : `Download complete: ${statusRes.data.path}`,
              color: 'green',
              icon: <IconCheck size={18} />,
              loading: false,
              autoClose: 5000,
              withCloseButton: true,
            });
          } else if (statusRes.data.status === 'download-failed') {
            clearInterval(interval);
            setDownloading((prev) => ({ ...prev, [book.id]: false }));
            notifications.update({
              id: notificationId,
              title: 'Failed',
              message: `Failed to process ${book.title}`,
              color: 'red',
              icon: <IconX size={18} />,
              loading: false,
              autoClose: 5000,
              withCloseButton: true,
            });
          }
        } catch (err) {
          if (attempts > 30) {
            clearInterval(interval);
            setDownloading((prev) => ({ ...prev, [book.id]: false }));
            notifications.update({
              id: notificationId,
              title: 'Timeout',
              message: 'Check logs for download status.',
              color: 'yellow',
              loading: false,
              autoClose: 5000,
            });
          }
        }
      }, 2000);
    } catch (error) {
      setDownloading((prev) => ({ ...prev, [book.id]: false }));
      notifications.update({
        id: notificationId,
        title: 'Error',
        message: 'Could not start process',
        color: 'red',
        icon: <IconX size={18} />,
        loading: false,
        autoClose: 5000,
      });
    }
  };

  const visibleBooks = books.slice(0, visibleCount);

  const BookCard = ({ book }) => (
    <Card withBorder shadow="sm" radius="md" padding="md">
      <Stack gap="xs">
        <Text fw={700} size="lg" lineClamp={2} style={{ lineHeight: 1.2 }}>
          {book.title}
        </Text>
        
        <Text size="sm" c="dimmed">
          {book.authors}{book.publisher ? ` • ${book.publisher}` : ''}
        </Text>
        
        <Group gap="xs">
          <Badge variant="outline" color="black" size="sm">{book.year}</Badge>
          <Badge variant="outline" color="black" size="sm">{book.language}</Badge>
          <Badge variant="outline" color="black" size="sm">{book.size}</Badge>
        </Group>

        <Divider my="xs" />

        <Group grow gap="xs">
          <Button
            variant="filled"
            size="sm"
            color="black"
            leftSection={<IconSend size={16} />}
            onClick={() => handleDownload(book, true)}
            disabled={downloading[book.id]}
          >
            {downloading[book.id] ? '...' : 'Kindle'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            color="black"
            component="a"
            href={book.detail_url}
            target="_blank"
            leftSection={<IconExternalLink size={16} />}
          >
            LibGen
          </Button>
        </Group>
      </Stack>
    </Card>
  );

  return (
    <Container size="lg" py="xl">
      <Stack align="center" gap="md" mt={books.length > 0 ? 0 : 40} style={{ transition: 'all 0.5s ease' }}>
        <Image 
          src={bannerImg} 
          className="torn-paper" 
          w={{ base: 200, sm: 300 }} 
          alt="Book Thief Banner"
          fallbackSrc="https://placehold.co/300x150?text=Book+Thief"
        />
        <Title order={1} style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', fontWeight: 900, color: '#000', marginTop: -20 }}>
          Book<span style={{ color: '#F5F5DC', WebkitTextStroke: '1px black' }}>Thief</span>
        </Title>
        <Group style={{ width: '100%', maxWidth: 600 }} wrap={isMobile ? "wrap" : "nowrap"}>
          <TextInput
            placeholder="Search book, author, ISBN..."
            size="md"
            style={{ flex: 1, minWidth: isMobile ? '100%' : 'auto' }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            leftSection={<IconSearch size={18} />}
          />
          <Button 
            size="md" 
            onClick={handleSearch} 
            loading={loading} 
            color="black"
            fullWidth={isMobile}
          >
            Search
          </Button>
        </Group>
      </Stack>

      {books.length > 0 && (
        <Stack mt="xl" gap="md">
          {isMobile ? (
            <Stack gap="md">
              {visibleBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </Stack>
          ) : (
            <Table.ScrollContainer minWidth={800}>
              <Table highlightOnHover withTableBorder verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Title</Table.Th>
                    <Table.Th>Author</Table.Th>
                    <Table.Th>Publisher</Table.Th>
                    <Table.Th>Year</Table.Th>
                    <Table.Th>Lang</Table.Th>
                    <Table.Th>Size</Table.Th>
                    <Table.Th>Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {visibleBooks.map((book) => (
                    <Table.Tr key={book.id}>
                      <Table.Td>
                        <Text fw={500} size="sm" lineClamp={2}>
                          {book.title}
                        </Text>
                      </Table.Td>
                      <Table.Td size="sm">{book.authors}</Table.Td>
                      <Table.Td size="sm">{book.publisher}</Table.Td>
                      <Table.Td size="sm">{book.year}</Table.Td>
                      <Table.Td size="sm">{book.language}</Table.Td>
                      <Table.Td size="sm">{book.size}</Table.Td>
                      <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <ActionIcon
                          variant="filled"
                          color="black"
                          onClick={() => handleDownload(book, true)}
                          disabled={downloading[book.id]}
                          title="Kindle"
                        >
                          <IconSend size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="outline"
                          color="black"
                          component="a"
                          href={book.detail_url}
                          target="_blank"
                          title="LibGen"
                        >
                          <IconExternalLink size={16} />
                        </ActionIcon>
                      </Group>

                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
          
          {visibleCount < books.length && (
            <Center py="md">
              <Button 
                variant="subtle" 
                color="black" 
                onClick={() => setVisibleCount(prev => prev + 20)}
              >
                Show More ({books.length - visibleCount} remaining)
              </Button>
            </Center>
          )}
        </Stack>
      )}

      {hasSearched && !loading && books.length === 0 && (
        <Center mt="xl">
          <Stack align="center" gap="sm">
            <Text fw={700} size="xl" c="black">No results found</Text>
            <Image 
              src={noResultsImg} 
              w={{ base: 250, sm: 400 }} 
              radius="md"
              alt="No Results"
              fallbackSrc="https://placehold.co/400x300?text=No+Results"
            />
          </Stack>
        </Center>
      )}
      
      {loading && books.length === 0 && (
        <Center mt="xl">
          <Loader color="beige" />
        </Center>
      )}
    </Container>
  );
}

export default App;

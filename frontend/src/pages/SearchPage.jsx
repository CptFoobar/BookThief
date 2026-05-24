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
  rem,
} from '@mantine/core';
import {
  IconSearch,
  IconExternalLink,
  IconSend,
} from '@tabler/icons-react';
import bannerImg from '../assets/book-thief-banner.jpeg';
import noResultsImg from '../assets/book-thief-no-results.jpeg';

export function SearchPage({
  query,
  setQuery,
  loading,
  books,
  hasSearched,
  visibleCount,
  setVisibleCount,
  downloading,
  handleSearch,
  handleDownload,
  isMobile,
}) {
  const visibleBooks = books.slice(0, visibleCount);

  const BookCard = ({ book }) => (
    <Card withBorder shadow="sm" radius="md" padding="md">
      <Stack gap="xs" style={{ flex: 1 }}>
        <Group align="flex-start" wrap="nowrap">
          {book.cover_url && (
            <Image
              src={book.cover_url}
              w={"auto"}
              
              radius="sm"
              alt={book.title}
              fallbackSrc="https://placehold.co/80x120?text=No+Cover"
            />
          )}
          <Stack>
            <Text fw={700} size="xl" lineClamp={2} style={{ lineHeight: 1.2 }}>
              {book.title}
            </Text>

            <Text size="md" c="dimmed">
              {book.authors}{book.publisher ? ` • ${book.publisher}` : ''}
            </Text>

            <Group gap="xs">
              <Badge variant="outline" color="black" size="md">{book.year}</Badge>
              <Badge variant="outline" color="black" size="md">{book.language}</Badge>
              <Badge variant="outline" color="black" size="md">{book.size}</Badge>
            </Group>
          </Stack>
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
          w={{ base: 300, sm: 500 }}
          alt="Book Thief Banner"
          fallbackSrc="https://placehold.co/300x150?text=Book+Thief"
        />
        <Title order={1} style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', fontWeight: 900, color: '#000', marginTop: -20 }} pt="lg">
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
                    <Table.Th w={60}></Table.Th>
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
                        {book.cover_url && (
                          <Image
                            src={book.cover_url}
                            w={40}
                            radius="xs"
                            fallbackSrc="https://placehold.co/40x60?text=?"
                          />
                        )}
                      </Table.Td>
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
              radius="md"
              alt="No Results"
              fallbackSrc="https://placehold.co/400x300?text=No+Results"
            />
          </Stack>
        </Center>
      )}
    </Container>
  );
}

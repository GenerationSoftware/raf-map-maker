import { ApolloClient, InMemoryCache, gql, createHttpLink } from '@apollo/client';

// Create HTTP link
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:42069/graphql',
});

// Create Apollo Client instance
export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

// GraphQL Queries
export const GET_MONSTERS = gql`
  query GetMonsters {
    monsters {
      items {
        id
        characterAddress
        index
        health
        character {
          name
        }
      }
    }
  }
`;

// TypeScript interfaces for GraphQL responses
export interface Monster {
  id: string;
  characterAddress: string;
  index: string;
  health: string;
  character: {
    name: string;
  };
}

export interface MonstersResponse {
  monsters: {
    items: Monster[];
  };
}

// Fetch monsters with proper error handling
export async function fetchMonsters(): Promise<Monster[]> {
  try {
    const { data } = await apolloClient.query<MonstersResponse>({
      query: GET_MONSTERS,
      fetchPolicy: 'cache-first', // Use cache if available, otherwise fetch
    });
    
    return data?.monsters?.items || [];
  } catch (error) {
    console.error('Error fetching monsters:', error);
    // Return fallback data if GraphQL fails
    return [
      { id: '0', characterAddress: '0x0', index: '0', health: '40', character: { name: 'Goblin' } },
      { id: '1', characterAddress: '0x1', index: '1', health: '50', character: { name: 'ThiccGoblin' } },
      { id: '2', characterAddress: '0x2', index: '2', health: '80', character: { name: 'Troll' } },
      { id: '3', characterAddress: '0x3', index: '3', health: '100', character: { name: 'Orc' } },
    ];
  }
}
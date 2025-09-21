import { ApiResponse } from '../../src/lib/api-client/endpoints'

export const sampleStandingsApiResponse: ApiResponse<any[]> = {
  get: 'standings',
  parameters: {
    league: '39',
    season: '2024'
  },
  errors: [],
  results: 1,
  paging: {
    current: 1,
    total: 1
  },
  response: [
    {
      league: {
        id: 39,
        name: 'Premier League',
        country: 'England',
        logo: 'https://example.com/premier-league.png',
        flag: 'https://example.com/england.png',
        season: 2024,
        standings: [[
          {
            rank: 1,
            team: {
              id: 33,
              name: 'Manchester United',
              logo: 'https://example.com/manchester-united.png'
            },
            points: 90,
            goalsDiff: 45,
            group: 'Premier League',
            form: 'WWWWW',
            status: 'same',
            description: 'Champions League',
            all: {
              played: 38,
              win: 29,
              draw: 3,
              lose: 6,
              goals: {
                for: 85,
                against: 40
              }
            },
            home: {
              played: 19,
              win: 15,
              draw: 2,
              lose: 2,
              goals: {
                for: 45,
                against: 15
              }
            },
            away: {
              played: 19,
              win: 14,
              draw: 1,
              lose: 4,
              goals: {
                for: 40,
                against: 25
              }
            },
            update: '2025-01-15T12:00:00+00:00'
          }
        ]]
      }
    }
  ]
}

export const sampleFixturesApiResponse: ApiResponse<any[]> = {
  get: 'fixtures',
  parameters: {
    league: '39',
    season: '2024'
  },
  errors: [],
  results: 1,
  paging: {
    current: 1,
    total: 1
  },
  response: [
    {
      fixture: {
        id: 1200001,
        referee: 'Michael Oliver',
        timezone: 'UTC',
        date: '2025-01-18T15:00:00+00:00',
        timestamp: 1737212400,
        periods: {
          first: 1737212400,
          second: 1737216000
        },
        venue: {
          id: 556,
          name: 'Old Trafford',
          city: 'Manchester'
        },
        status: {
          long: 'Match Finished',
          short: 'FT',
          elapsed: 90
        }
      },
      league: {
        id: 39,
        name: 'Premier League',
        country: 'England',
        logo: 'https://example.com/league.png',
        flag: 'https://example.com/flag.png',
        season: 2024,
        round: 'Regular Season - 21'
      },
      teams: {
        home: {
          id: 33,
          name: 'Manchester United',
          logo: 'https://example.com/mu.png',
          winner: true
        },
        away: {
          id: 50,
          name: 'Manchester City',
          logo: 'https://example.com/mc.png',
          winner: false
        }
      },
      goals: {
        home: 2,
        away: 1
      },
      score: {
        halftime: {
          home: 1,
          away: 0
        },
        fulltime: {
          home: 2,
          away: 1
        },
        extratime: {
          home: null,
          away: null
        },
        penalty: {
          home: null,
          away: null
        }
      }
    }
  ]
}

export const sampleTeamByIdResponse: ApiResponse<any[]> = {
  get: 'teams',
  parameters: {
    id: '33'
  },
  errors: [],
  results: 1,
  paging: {
    current: 1,
    total: 1
  },
  response: [
    {
      team: {
        id: 33,
        name: 'Manchester United',
        code: 'MUN',
        country: 'England',
        founded: 1878,
        national: false,
        logo: 'https://example.com/mu-logo.png'
      },
      venue: {
        id: 556,
        name: 'Old Trafford',
        address: 'Sir Matt Busby Way',
        city: 'Manchester',
        capacity: 74879,
        surface: 'Grass',
        image: 'https://example.com/old-trafford.png'
      }
    }
  ]
}

export const sampleTeamSearchResponse: ApiResponse<any[]> = {
  get: 'teams',
  parameters: {
    search: 'arsenal'
  },
  errors: [],
  results: 1,
  paging: {
    current: 1,
    total: 1
  },
  response: [
    {
      team: {
        id: 42,
        name: 'Arsenal',
        code: 'ARS',
        country: 'England',
        founded: 1886,
        national: false,
        logo: 'https://example.com/arsenal.png'
      },
      venue: {
        id: 494,
        name: 'Emirates Stadium',
        address: 'Hornsey Road',
        city: 'London',
        capacity: 60260,
        surface: 'Grass',
        image: 'https://example.com/emirates.png'
      }
    }
  ]
}

export const sampleSquadResponse: ApiResponse<any[]> = {
  get: 'players/squads',
  parameters: {
    team: '33',
    season: '2024'
  },
  errors: [],
  results: 1,
  paging: {
    current: 1,
    total: 1
  },
  response: [
    {
      team: {
        id: 33,
        name: 'Manchester United',
        logo: 'https://example.com/mu.png'
      },
      players: [
        {
          player: {
            id: 19088,
            name: 'Marcus Rashford',
            firstname: 'Marcus',
            lastname: 'Rashford',
            age: 27,
            birth: {
              date: '1997-10-31',
              place: 'Manchester',
              country: 'England'
            },
            nationality: 'England',
            height: '180 cm',
            weight: '70 kg',
            injured: false,
            photo: 'https://example.com/rashford.png'
          }
        }
      ]
    }
  ]
}

export const samplePlayerResponse: ApiResponse<any[]> = {
  get: 'players',
  parameters: {
    id: '278'
  },
  errors: [],
  results: 1,
  paging: {
    current: 1,
    total: 1
  },
  response: [
    {
      player: {
        id: 278,
        name: 'Erling Haaland',
        firstname: 'Erling',
        lastname: 'Haaland',
        age: 24,
        birth: {
          date: '2000-07-21',
          place: 'Leeds',
          country: 'England'
        },
        nationality: 'Norway',
        height: '194 cm',
        weight: '88 kg',
        injured: false,
        photo: 'https://example.com/haaland.png'
      },
      statistics: [
        {
          team: {
            id: 50,
            name: 'Manchester City',
            logo: 'https://example.com/mc.png'
          },
          league: {
            id: 39,
            name: 'Premier League',
            country: 'England',
            logo: 'https://example.com/league.png',
            flag: 'https://example.com/flag.png',
            season: 2024
          },
          games: {
            appearences: 34,
            lineups: 32,
            minutes: 2800,
            number: 9,
            position: 'Attacker',
            rating: '7.8',
            captain: false
          },
          substitutes: {
            in: 2,
            out: 12,
            bench: 3
          },
          shots: {
            total: 100,
            on: 60
          },
          goals: {
            total: 30,
            conceded: 0,
            assists: 5,
            saves: null
          },
          passes: {
            total: 500,
            key: 40,
            accuracy: 82
          },
          tackles: {
            total: 10,
            blocks: 2,
            interceptions: 5
          },
          duels: {
            total: 120,
            won: 70
          },
          dribbles: {
            attempts: 30,
            success: 20,
            past: 5
          },
          fouls: {
            drawn: 40,
            committed: 20
          },
          cards: {
            yellow: 3,
            yellowred: 0,
            red: 0
          },
          penalty: {
            won: 4,
            commited: 1,
            scored: 4,
            missed: 1,
            saved: 0
          }
        }
      ]
    }
  ]
}

export const samplePlayerSearchResponse: ApiResponse<any[]> = {
  get: 'players',
  parameters: {
    search: 'rashford'
  },
  errors: [],
  results: 1,
  paging: {
    current: 1,
    total: 1
  },
  response: [
    {
      player: {
        id: 19088,
        name: 'Marcus Rashford',
        firstname: 'Marcus',
        lastname: 'Rashford',
        age: 27,
        birth: {
          date: '1997-10-31',
          place: 'Manchester',
          country: 'England'
        },
        nationality: 'England',
        height: '180 cm',
        weight: '70 kg',
        injured: false,
        photo: 'https://example.com/rashford.png'
      },
      statistics: [
        {
          team: {
            id: 33,
            name: 'Manchester United',
            logo: 'https://example.com/mu.png'
          },
          league: {
            id: 39,
            name: 'Premier League',
            country: 'England',
            logo: 'https://example.com/league.png',
            flag: 'https://example.com/flag.png',
            season: 2024
          },
          games: {
            appearences: 32,
            lineups: 28,
            minutes: 2500,
            number: 10,
            position: 'Attacker',
            rating: '7.1',
            captain: false
          },
          substitutes: {
            in: 4,
            out: 15,
            bench: 6
          },
          shots: {
            total: 80,
            on: 40
          },
          goals: {
            total: 18,
            conceded: 0,
            assists: 7,
            saves: null
          },
          passes: {
            total: 700,
            key: 50,
            accuracy: 85
          },
          tackles: {
            total: 12,
            blocks: 3,
            interceptions: 8
          },
          duels: {
            total: 150,
            won: 90
          },
          dribbles: {
            attempts: 60,
            success: 35,
            past: 10
          },
          fouls: {
            drawn: 30,
            committed: 25
          },
          cards: {
            yellow: 2,
            yellowred: 0,
            red: 0
          },
          penalty: {
            won: 3,
            commited: 1,
            scored: 2,
            missed: 1,
            saved: 0
          }
        }
      ]
    }
  ]
}

export const sampleMatchEventsResponse: ApiResponse<any[]> = {
  get: 'fixtures/events',
  parameters: {
    fixture: '1200001'
  },
  errors: [],
  results: 2,
  paging: {
    current: 1,
    total: 1
  },
  response: [
    {
      time: {
        elapsed: 23,
        extra: null
      },
      team: {
        id: 33,
        name: 'Manchester United',
        logo: 'https://example.com/mu.png'
      },
      player: {
        id: 19088,
        name: 'Marcus Rashford'
      },
      assist: {
        id: 200,
        name: 'Bruno Fernandes'
      },
      type: 'Goal',
      detail: 'Normal Goal',
      comments: null
    },
    {
      time: {
        elapsed: 87,
        extra: null
      },
      team: {
        id: 50,
        name: 'Manchester City',
        logo: 'https://example.com/mc.png'
      },
      player: {
        id: 278,
        name: 'Erling Haaland'
      },
      assist: {
        id: null,
        name: null
      },
      type: 'Goal',
      detail: 'Penalty',
      comments: null
    }
  ]
}

export const sampleLiveFixturesResponse: ApiResponse<any[]> = {
  get: 'fixtures/live',
  parameters: {
    league: '39'
  },
  errors: [],
  results: 1,
  paging: {
    current: 1,
    total: 1
  },
  response: [
    {
      ...sampleFixturesApiResponse.response[0],
      fixture: {
        ...sampleFixturesApiResponse.response[0].fixture,
        status: {
          long: 'Second Half',
          short: '2H',
          elapsed: 60
        }
      }
    }
  ]
}

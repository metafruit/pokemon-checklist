#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
import sys

def fetch_pokemon_data():
    url = "https://beta.pokeapi.co/graphql/v1beta"
    query = """
    query getPokemonData {
      pokemon_v2_pokemon(limit: 1025, order_by: {id: asc}) {
        id
        name
        pokemon_v2_pokemontypes {
          pokemon_v2_type {
            name
          }
        }
        pokemon_v2_pokemonspecy {
          generation_id
        }
      }
    }
    """
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    import ssl
    context = ssl._create_unverified_context()
    
    data = json.dumps({"query": query}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    
    print("Fetching Pokémon data from PokéAPI GraphQL endpoint...")
    try:
        with urllib.request.urlopen(req, context=context) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            if "errors" in res_data:
                print("GraphQL Errors:", res_data["errors"])
                sys.exit(1)
            
            raw_pokemon = res_data["data"]["pokemon_v2_pokemon"]
            formatted_pokemon = []
            
            for p in raw_pokemon:
                poke_id = p["id"]
                # Format name nicely (e.g. bulbasaur -> Bulbasaur, Mr. Mime -> Mr. Mime)
                name = p["name"].replace("-", " ").title()
                
                # Special casing names if needed (e.g. ho-oh, porygon-z)
                if p["name"] == "ho-oh":
                    name = "Ho-Oh"
                elif p["name"] == "porygon-z":
                    name = "Porygon-Z"
                elif p["name"] == "jangmo-o":
                    name = "Jangmo-o"
                elif p["name"] == "hakamo-o":
                    name = "Hakamo-o"
                elif p["name"] == "kommo-o":
                    name = "Kommo-o"
                
                types = [t["pokemon_v2_type"]["name"] for t in p["pokemon_v2_pokemontypes"]]
                
                # Get generation
                gen_id = p.get("pokemon_v2_pokemonspecy", {}).get("generation_id", 1)
                
                # Official artwork URL
                sprite_url = f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{poke_id}.png"
                
                formatted_pokemon.append({
                    "id": poke_id,
                    "name": name,
                    "types": types,
                    "generation": gen_id,
                    "sprite": sprite_url
                })
            
            # Save to file
            output_file = "/Users/sam/.gemini/antigravity/scratch/pokemon-checklist/pokemon_db.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(formatted_pokemon, f, indent=2, ensure_ascii=False)
            
            print(f"Successfully saved {len(formatted_pokemon)} Pokémon to {output_file}")
            
    except urllib.error.URLError as e:
        print(f"Failed to fetch data: {e}")
        sys.exit(1)

if __name__ == "__main__":
    fetch_pokemon_data()

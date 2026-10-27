import { Injectable, NotFoundException } from '@nestjs/common';
import type { SearchSalonsDto } from './salons.dto.js';

export interface Salon {
  id: number;
  name: string;
  city: string;
  category: string;
  minPrice: number;
  rating: number;
}

export interface Master {
  id: number;
  salonId: number;
  name: string;
}

const SALONS: Salon[] = [
  { id: 1, name: 'Alma Barber', city: 'Алматы', category: 'Барбершоп', minPrice: 4000, rating: 4.8 },
  { id: 2, name: 'Nomad Beauty', city: 'Алматы', category: 'Салон красоты', minPrice: 6000, rating: 4.6 },
  { id: 3, name: 'Turbo Service', city: 'Алматы', category: 'Автосервис', minPrice: 12000, rating: 4.4 },
  { id: 4, name: 'Astana Cut', city: 'Астана', category: 'Барбершоп', minPrice: 5000, rating: 4.7 },
  { id: 5, name: 'Steppe Auto', city: 'Астана', category: 'Автосервис', minPrice: 15000, rating: 4.2 },
];

const MASTERS: Master[] = SALONS.flatMap((salon) => [
  { id: salon.id * 2 - 1, salonId: salon.id, name: `Master ${salon.id}A` },
  { id: salon.id * 2, salonId: salon.id, name: `Master ${salon.id}B` },
]);

@Injectable()
export class SalonsService {
  search({ city, category, priceMin = 0, priceMax = 50_000, q }: SearchSalonsDto) {
    const nameMatcher = q ? new RegExp(q, 'i') : undefined;

    return SALONS.filter(
      (salon) =>
        (!city || salon.city.toLowerCase() === city.toLowerCase()) &&
        (!category || salon.category.toLowerCase() === category.toLowerCase()) &&
        salon.minPrice >= priceMin &&
        salon.minPrice <= priceMax &&
        (!nameMatcher || nameMatcher.test(salon.name)),
    );
  }

  findOne(id: number) {
    const salon = SALONS.find((candidate) => candidate.id === id);
    if (!salon) throw new NotFoundException(`Salon ${id} not found`);
    return { ...salon, masters: MASTERS.filter((master) => master.salonId === id) };
  }

  findMaster(id: number) {
    const master = MASTERS.find((candidate) => candidate.id === id);
    if (!master) throw new NotFoundException(`Master ${id} not found`);
    return master;
  }
}

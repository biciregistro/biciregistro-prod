import { adminDb } from '@/lib/firebase/server';
import { CampaignConversion, User, Bike } from '@/lib/types';
import { getGenerationId } from '@/lib/constants/generations';
import { getBikeRangeId } from '@/lib/constants/bike-ranges';
import { EventAnalyticsData } from './event-analytics'; 

export async function getCampaignAnalytics(campaignId: string): Promise<EventAnalyticsData | null> {
    try {
        if (!campaignId) return null;

        // 1. Get Conversions (Leads) strictly for this campaign
        const conversionsSnap = await adminDb
            .collection('campaign_conversions')
            .where('campaignId', '==', campaignId)
            .get();

        if (conversionsSnap.empty) {
            return {
                general: { 
                    totalRegistrations: 0, checkedInCount: 0, attendanceRate: 0, 
                    averageAge: 0, genderDistribution: [], userLocations: [], ageRanges: [], 
                    usersWithAge: 0, generationsDistribution: { 'gen_z': 0, 'millennials': 0, 'gen_x': 0, 'boomers': 0 }
                },
                market: { 
                    totalAssetValue: 0, averageAssetValue: 0, topBrands: [], topModalities: [], rangesDistribution: {}
                }
            };
        }

        const conversions = conversionsSnap.docs.map(doc => doc.data() as CampaignConversion);
        
        // Ensure unique user IDs and filter out invalid ones
        const userIdsSet = new Set<string>();
        conversions.forEach(c => {
            if (c.userId && typeof c.userId === 'string') {
                userIdsSet.add(c.userId);
            }
        });
        const userIds = Array.from(userIdsSet);

        // 2. Fetch Users
        let users: User[] = [];
        const chunkSize = 10; 
        
        for (let i = 0; i < userIds.length; i += chunkSize) {
            const chunk = userIds.slice(i, i + chunkSize);
            if (chunk.length === 0) continue;
            
            try {
                const userSnap = await adminDb.collection('users').where('id', 'in', chunk).get();
                userSnap.forEach(doc => users.push(doc.data() as User));
            } catch (e) {
                console.error("Error fetching user chunk:", e);
            }
        }

        // 3. Fetch ALL Bikes for these users (Market Profile)
        let bikes: Bike[] = [];
        
        for (let i = 0; i < userIds.length; i += chunkSize) {
            const chunk = userIds.slice(i, i + chunkSize);
            if (chunk.length === 0) continue;
            
            try {
                const bikeSnap = await adminDb.collection('bikes').where('userId', 'in', chunk).get();
                
                // Group by user to enforce limits and integrity
                const bikesByUser: Record<string, Bike[]> = {};
                
                bikeSnap.forEach(doc => {
                    const bikeData = doc.data() as Bike;
                    // Strict check: only include bikes owned by users in this chunk
                    if (chunk.includes(bikeData.userId)) {
                        if (!bikesByUser[bikeData.userId]) {
                            bikesByUser[bikeData.userId] = [];
                        }
                        bikesByUser[bikeData.userId].push(bikeData);
                    }
                });

                // Flatten results WITHOUT artificial limits (showing full reality)
                Object.values(bikesByUser).forEach(userBikes => {
                    bikes.push(...userBikes);
                });

            } catch (e) {
                console.error("Error fetching bike chunk:", e);
            }
        }

        // --- GENERAL CALCULATIONS ---
        const totalRegistrations = conversions.length;
        const checkedInCount = totalRegistrations;
        const attendanceRate = 100;

        // Demographics
        const ages: number[] = [];
        const genderCounts: Record<string, number> = {};
        const locationCounts: Record<string, number> = {};
        const ageRangesCounts: Record<string, number> = {
            '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0
        };
        const generationsDistribution: Record<string, number> = {
            'gen_z': 0, 'millennials': 0, 'gen_x': 0, 'boomers': 0
        };

        users.forEach(u => {
            // Gender
            const gender = u.gender ? (u.gender.charAt(0).toUpperCase() + u.gender.slice(1)) : 'No especificado';
            genderCounts[gender] = (genderCounts[gender] || 0) + 1;

            // Location
            const loc = u.city ? `${u.city}, ${u.state || ''}` : (u.state || 'Desconocido');
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;

            // Age
            if (u.birthDate) {
                const birthYear = new Date(u.birthDate).getFullYear();
                if (!isNaN(birthYear)) {
                    const age = new Date().getFullYear() - birthYear;
                    ages.push(age);
                    
                    if (age >= 18 && age <= 24) ageRangesCounts['18-24']++;
                    else if (age >= 25 && age <= 34) ageRangesCounts['25-34']++;
                    else if (age >= 35 && age <= 44) ageRangesCounts['35-44']++;
                    else if (age >= 45 && age <= 54) ageRangesCounts['45-54']++;
                    else if (age >= 55) ageRangesCounts['55+']++;

                    const genId = getGenerationId(u.birthDate);
                    if (genId !== 'unknown') {
                        generationsDistribution[genId]++;
                    }
                }
            }
        });

        const averageAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
        const usersWithAge = ages.length;

        const genderDistribution = Object.entries(genderCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const userLocations = Object.entries(locationCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        const ageRanges = Object.entries(ageRangesCounts)
            .map(([name, value]) => ({ name, value }));

        // --- MARKET CALCULATIONS ---
        const totalAssetValue = bikes.reduce((acc, b) => acc + (b.appraisedValue || 0), 0);
        const averageAssetValue = bikes.length > 0 ? Math.round(totalAssetValue / bikes.length) : 0;

        const brandCounts: Record<string, number> = {};
        const modalityCounts: Record<string, number> = {};
        const rangesDistribution: Record<string, number> = {
            'entry': 0, 'mid': 0, 'mid_high': 0, 'high': 0, 'superbike': 0
        };

        bikes.forEach(b => {
            const brand = b.make || 'Desconocida';
            brandCounts[brand] = (brandCounts[brand] || 0) + 1;

            const modality = b.modality || 'Desconocida';
            modalityCounts[modality] = (modalityCounts[modality] || 0) + 1;

            if (b.appraisedValue) {
                const rangeId = getBikeRangeId(b.appraisedValue);
                if (rangeId !== 'unknown') {
                    rangesDistribution[rangeId] = (rangesDistribution[rangeId] || 0) + 1;
                }
            }
        });

        const topBrands = Object.entries(brandCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        const topModalities = Object.entries(modalityCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        return {
            general: {
                totalRegistrations,
                checkedInCount,
                attendanceRate,
                averageAge,
                genderDistribution,
                userLocations,
                ageRanges,
                usersWithAge,
                generationsDistribution
            },
            market: {
                totalAssetValue,
                averageAssetValue,
                topBrands,
                topModalities,
                rangesDistribution
            }
        };

    } catch (error) {
        console.error("Error fetching campaign analytics:", error);
        return null;
    }
}

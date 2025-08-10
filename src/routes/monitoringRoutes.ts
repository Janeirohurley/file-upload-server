import { Router } from 'express';
import { performance, PerformanceObserver } from 'perf_hooks';

const router = Router();

// Fonction pour mesurer le délai de la boucle d'événements
let lastLoopTime = performance.now();
let delays: number[] = [];

function measureEventLoopDelay() {
    const now = performance.now();
    const delay = now - lastLoopTime;
    lastLoopTime = now;

    delays.push(delay);
    if (delays.length > 100) delays.shift(); // Garder les 100 derniers échantillons

    return delay;
}

// Mettre à jour les métriques toutes les 100ms
setInterval(measureEventLoopDelay, 100);

// Calculer les statistiques
function getStats() {
    if (delays.length === 0) return null;

    const min = Math.min(...delays);
    const max = Math.max(...delays);
    const mean = delays.reduce((sum, val) => sum + val, 0) / delays.length;
    const stddev = Math.sqrt(
        delays.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / delays.length
    );

    return { min, max, mean, stddev, num: delays.length };
}

// Route pour récupérer les métriques
/**
 * @swagger
 * /monitoring/event-loop:
 *   get:
 *     summary: Récupère les métriques de la boucle d'événements
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Métriques récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     min:
 *                       type: string
 *                     max:
 *                       type: string
 *                     mean:
 *                       type: string
 *                     stddev:
 *                       type: string
 *                     num:
 *                       type: integer
 *       503:
 *         description: Aucune métrique disponible
 */
router.get('/event-loop', (req, res) => {
    const stats = getStats();
    if (stats) {
        res.json({
            status: 'success',
            data: {
                min: stats.min.toFixed(3), // En millisecondes
                max: stats.max.toFixed(3),
                mean: stats.mean.toFixed(3),
                stddev: stats.stddev.toFixed(3),
                num: stats.num,
            },
        });
    } else {
        res.status(503).json({
            status: 'error',
            message: 'Aucune métrique disponible pour le moment.',
        });
    }
});

export default router;
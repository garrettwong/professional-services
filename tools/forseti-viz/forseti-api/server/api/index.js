import { version } from '../../package.json';
import { Router } from 'express';
import examples from './example';
import forseti from './forseti';

export default ({ config, db }) => {
	let api = Router();

	// mount the examples resource
	api.use('/examples', examples({ config, db }));
	api.use('/forseti', forseti({ config, db }));

	// perhaps expose some API metadata at the root
	api.get('/', (req, res) => {
		res.json({ version });
    });

	return api;
}
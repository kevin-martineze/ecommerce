<script lang="ts">
	// Componentes
	import { Badge } from '$lib/components/atoms/badge';

	// Dominio
	import { USER_STATUS_LABEL } from '$lib/domain/account';

	interface Props {
		disabled: boolean;
	}

	let { disabled }: Props = $props();
</script>

<Badge variant={disabled ? 'destructive' : 'secondary'}>
	{USER_STATUS_LABEL[disabled ? 'disabled' : 'active']}
</Badge>

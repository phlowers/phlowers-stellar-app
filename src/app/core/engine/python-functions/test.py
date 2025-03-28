import pytest
import time

class ResultsCollector:
    def __init__(self):
        self.reports = []
        self.collected = 0
        self.exitcode = 0
        self.passed = 0
        self.failed = 0
        self.xfailed = 0
        self.skipped = 0
        self.total_duration = 0

    @pytest.hookimpl(hookwrapper=True)
    def pytest_runtest_makereport(self, item, call):
        outcome = yield
        report = outcome.get_result()
        if report.when == 'call':
            self.reports.append(report)

    def pytest_collection_modifyitems(self, items):
        self.collected = len(items)

    def pytest_terminal_summary(self, terminalreporter, exitstatus):
        self.exitcode = exitstatus
        self.passed = len(terminalreporter.stats.get('passed', []))
        self.failed = len(terminalreporter.stats.get('failed', []))
        self.xfailed = len(terminalreporter.stats.get('xfailed', []))
        self.skipped = len(terminalreporter.stats.get('skipped', []))

        self.total_duration = time.time() - terminalreporter._sessionstarttime


collector = ResultsCollector()
pytest.main(['-s', '--color', 'no', "--quiet", '--tb=line', '--pyargs', 'mechaphlowers'], plugins=[collector])
# for report in collector.reports:
#     print('id:', report.nodeid, 'outcome:', report.outcome)  # etc
print('exit code:', collector.exitcode)
print('passed:', collector.passed, 'failed:', collector.failed, 'xfailed:', collector.xfailed, 'skipped:', collector.skipped)
print('total duration:', collector.total_duration)
results = {
    "passed": collector.passed,
    "failed": collector.failed,
    "xfailed": collector.xfailed,
    "skipped": collector.skipped,
    "duration": collector.total_duration,
}
